#!/usr/bin/env bash
# One-time setup so the Release workflow (.github/workflows/release.yml) can deploy to the cluster.
#
# RUN IT YOURSELF, with a cluster-admin kubectl context and `gh` logged in as an admin of the repository:
#   bash scripts/setup-release-access.sh
#
# What it does (read it first, it is short):
#   1. creates a ServiceAccount + Role + token Secret in the "gscores" namespace (k8s/rbac/deployer.yaml).
#      The account can only manage the app's own resources there: no secrets, no other namespaces.
#   2. creates the GitHub environment "production"
#   3. stores the cluster URL, its CA certificate and the ServiceAccount token as secrets of that environment.
#      The token is piped straight into `gh secret set`; it is never printed or written to disk.
#
# Undo: kubectl -n gscores delete secret github-deployer-token   (revokes the token at once)
set -euo pipefail

REPO="${REPO:-TinMH/G-Scores}"
NS="${NS:-gscores}"
ENVIRONMENT="${ENVIRONMENT:-production}"
cd "$(dirname "$0")/.."

command -v kubectl >/dev/null || { echo "kubectl not found"; exit 1; }
command -v gh >/dev/null || { echo "gh not found"; exit 1; }

echo "Cluster context : $(kubectl config current-context)"
echo "GitHub repo     : $REPO   environment: $ENVIRONMENT"
read -r -p "Create the deployer ServiceAccount in namespace '$NS' and store its token in GitHub? [y/N] " ok
[ "$ok" = "y" ] || [ "$ok" = "Y" ] || { echo "Aborted."; exit 1; }

echo "1/4  ServiceAccount, Role, RoleBinding and token Secret"
kubectl apply -f k8s/rbac/deployer.yaml

echo "2/4  Waiting for Kubernetes to issue the token"
for _ in $(seq 1 30); do
  token_len=$(kubectl -n "$NS" get secret github-deployer-token -o jsonpath='{.data.token}' 2>/dev/null | wc -c)
  [ "$token_len" -gt 100 ] && break
  sleep 2
done
[ "$token_len" -gt 100 ] || { echo "The token was not issued in time"; exit 1; }

server="$(kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.server}')"
ca_data="$(kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')"
[ -n "$server" ] || { echo "Could not read the API server URL from your kubeconfig"; exit 1; }
[ -n "$ca_data" ] || { echo "Your kubeconfig references the CA by file path; embed it (certificate-authority-data) and retry"; exit 1; }

echo "3/4  Checking the token works from outside, with the right (and only the right) permissions"
tmp_ca="$(mktemp)"; trap 'rm -f "$tmp_ca"' EXIT
printf '%s' "$ca_data" | base64 -d > "$tmp_ca"
kc() { kubectl --server="$server" --certificate-authority="$tmp_ca" --token="$(kubectl -n "$NS" get secret github-deployer-token -o jsonpath='{.data.token}' | base64 -d)" "$@"; }
# `kubectl auth can-i` prints "yes", or "no" optionally followed by a reason ("no - no RBAC policy matched"),
# so compare the first word, and show the raw answer so a surprise is visible instead of guessed at.
answer() { kc auth can-i "$@" 2>/dev/null || true; }
expect() { # expect <yes|no> <description> <can-i args...>
  local want="$1" what="$2" got; shift 2
  got="$(answer "$@")"
  printf '     %-44s -> %s\n' "$what" "${got:-<no answer: is the API server reachable with this token?>}"
  case "$got" in
    "$want"*) ;;
    *) echo "     UNEXPECTED: wanted '$want' for: $what"; exit 1 ;;
  esac
}
expect yes "patch deployments in $NS"              patch deployments.apps -n "$NS"
expect yes "delete jobs in $NS"                    delete jobs.batch -n "$NS"
expect no  "get secrets in $NS"                    get secrets -n "$NS"
expect no  "get pods in kube-system"               get pods -n kube-system
expect no  "create namespaces (cluster-wide)"      create namespaces
echo "     ok: can deploy in '$NS', cannot read secrets or touch other namespaces"

echo "4/4  GitHub environment '$ENVIRONMENT' and its secrets"
gh api -X PUT "repos/$REPO/environments/$ENVIRONMENT" >/dev/null
printf '%s' "$server"  | gh secret set KUBE_SERVER  --env "$ENVIRONMENT" --repo "$REPO"
printf '%s' "$ca_data" | gh secret set KUBE_CA_DATA --env "$ENVIRONMENT" --repo "$REPO"
kubectl -n "$NS" get secret github-deployer-token -o jsonpath='{.data.token}' | base64 -d | gh secret set KUBE_TOKEN --env "$ENVIRONMENT" --repo "$REPO"

cat <<EOF

Done. API server stored: $server
  - It must be reachable from GitHub's runners (they come from changing public IPs).
  - Verify end to end without deploying anything:  Actions -> Release -> Run workflow -> check_only = true
  - Release for real:  git tag -a v1.0.0 -m "v1.0.0" && git push origin v1.0.0
EOF
