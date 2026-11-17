#!/usr/bin/env bash
# Update the live site to a build CI has published, with one command, using YOUR kubectl context.
#
#   bash scripts/deploy.sh                 deploy the current origin/main  (CI must have finished publishing its images)
#   bash scripts/deploy.sh <tag>           deploy a specific image tag (a full commit SHA, or any tag that exists on GHCR)
#   bash scripts/deploy.sh --dry-run       show what would change, touch nothing
#   bash scripts/deploy.sh --rollback      go back to the previous version of api and web
#
# Options: --yes (no confirmation)  --no-verify (skip the live check)  --write (record the tag in k8s/kustomization.yaml)
# Environment: SITE_URL (default https://gscores.appforsell.com), NS (gscores), EXPECT_CONTEXT (microk8s)
#
# What a deploy does, in this order (it stops at the first problem, and tells you what state things are in):
#   1. checks the cluster context and that all three images exist on GHCR
#   2. runs the migration Job FIRST (idempotent: applies pending migrations, never reloads the data); if it fails,
#      nothing else has changed
#   3. rolls out api and web, and waits; if that fails they are rolled back automatically
#   4. runs the smoke check against the live site; if that fails they are rolled back automatically
# Database migrations are never rolled back; keep them backwards compatible.
set -euo pipefail
cd "$(dirname "$0")/.."

NS="${NS:-gscores}"
OWNER="${OWNER:-tinmh}"                      # GHCR namespace, lower case
SITE_URL="${SITE_URL:-https://gscores.appforsell.com}"
EXPECT_CONTEXT="${EXPECT_CONTEXT:-microk8s}"
SMOKE_SCRIPT="${SMOKE_SCRIPT:-scripts/smoke-check.sh}"
IMAGES=(api seeder web)

TAG=""; DRY=false; YES=false; VERIFY=true; WRITE=false; ROLLBACK=false
usage() { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; }
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=true ;;
    --yes|-y) YES=true ;;
    --no-verify) VERIFY=false ;;
    --write) WRITE=true ;;
    --rollback) ROLLBACK=true ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "unknown option: $arg (try --help)"; exit 2 ;;
    *) TAG="$arg" ;;
  esac
done

say() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
confirm() {
  $YES && return 0
  read -r -p "$1 [y/N] " ok
  [ "$ok" = "y" ] || [ "$ok" = "Y" ] || { say "Aborted, nothing was changed."; exit 1; }
}
running_images() { # "api=<image> web=<image>"
  kubectl -n "$NS" get deployment api web -o jsonpath='{range .items[*]}{.metadata.name}{"="}{.spec.template.spec.containers[0].image}{"\n"}{end}'
}
rollout_wait() {
  kubectl -n "$NS" rollout status deployment/api --timeout=300s && kubectl -n "$NS" rollout status deployment/web --timeout=300s
}
rollback() {
  say "Rolling back api and web to the previous version..."
  kubectl -n "$NS" rollout undo deployment/api
  kubectl -n "$NS" rollout undo deployment/web
  rollout_wait || say "WARNING: the rollback did not settle, check: kubectl -n $NS get pods"
}
verify_live() {
  $VERIFY || { say "Skipping the live check (--no-verify)."; return 0; }
  if ! command -v jq >/dev/null 2>&1; then
    say "jq is not installed: falling back to a health check only (install jq for the full smoke check)."
    curl -fsS -m 30 "${SITE_URL%/}/api/health" | grep -q '"ok"'
    return
  fi
  WAIT_SECONDS=120 bash "$SMOKE_SCRIPT" "$SITE_URL"
}

command -v kubectl >/dev/null || die "kubectl not found"

ctx="$(kubectl config current-context)"
say "Cluster context : $ctx"
say "Namespace       : $NS"
if [ "$ctx" != "$EXPECT_CONTEXT" ]; then
  if $YES; then
    say "(context is not '$EXPECT_CONTEXT', continuing because of --yes)"
  else
    die "context is '$ctx', expected '$EXPECT_CONTEXT'. Switch with: kubectl config use-context $EXPECT_CONTEXT (or set EXPECT_CONTEXT / use --yes)"
  fi
fi
kubectl get namespace "$NS" >/dev/null 2>&1 || die "namespace '$NS' does not exist; see k8s/README.md for the first-time setup"

# ---- rollback --------------------------------------------------------------------------------------------------
if $ROLLBACK; then
  say "Currently running:"; running_images | sed 's/^/  /'
  $DRY && { say "(dry run) would run: kubectl rollout undo deployment/api deployment/web"; exit 0; }
  confirm "Roll api and web back to their previous revision?"
  rollback
  verify_live
  say "Rolled back."
  exit 0
fi

# ---- deploy ----------------------------------------------------------------------------------------------------
command -v docker >/dev/null || die "docker not found (needed to check that the images exist on GHCR)"
command -v node >/dev/null || die "node not found"

if [ -z "$TAG" ]; then
  git fetch -q origin main || die "could not fetch origin/main"
  TAG="$(git rev-parse origin/main)"
  say "Version         : origin/main = ${TAG:0:7}"
else
  say "Version         : $TAG"
fi

say "Checking that the images exist on GHCR..."
for n in "${IMAGES[@]}"; do
  docker manifest inspect "ghcr.io/$OWNER/gscores-$n:$TAG" >/dev/null 2>&1 \
    || die "ghcr.io/$OWNER/gscores-$n:$TAG does not exist. If this is the newest commit, wait for the CI run on main to finish publishing it."
done

before="$(running_images)"
say "Currently running:"; while read -r line; do say "  $line"; done <<< "$before"
if [ "$(echo "$before" | grep -c ":$TAG\$")" -eq 2 ] && ! $DRY; then
  say "Already running $TAG, nothing to do."; exit 0
fi

work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
work="$(cd "$work" && { pwd -W 2>/dev/null || pwd; })"   # Git Bash: C:/... so native kubectl and node accept it
kubectl kustomize k8s \
  | sed -E "s#(ghcr\.io/$OWNER/gscores-(api|seeder|web)):[A-Za-z0-9._-]+#\1:$TAG#g" > "$work/rendered.yaml"
[ "$(grep -cE "image: ghcr\.io/$OWNER/gscores-(api|seeder|web):$TAG\$" "$work/rendered.yaml")" -eq 3 ] \
  || die "could not pin the three images to $TAG in the rendered manifests"
# The manifest goes to node on stdin (not as a path argument), so no path translation is involved.
node -e 'const s=require("fs").readFileSync(0,"utf8");
  process.stdout.write(s.split(/^---\s*$/m).filter(d=>/^kind:\s*Job\s*$/m.test(d)).join("---\n"))' < "$work/rendered.yaml" > "$work/job.yaml"
[ -s "$work/job.yaml" ] || die "no migration Job found in the manifests"

say "Will deploy:"; grep -E "image: ghcr" "$work/rendered.yaml" | sort -u | sed -E 's/^ *(- )?image: /  /'
$DRY && { say "(dry run) nothing was changed."; exit 0; }
confirm "Deploy $TAG to '$ctx'?"

say "1/4  Migrating the database (the previous Job is replaced; the seeder only applies pending migrations)"
kubectl -n "$NS" delete job db-migrate-seed --ignore-not-found --wait=true
kubectl apply -f "$work/job.yaml"
job_state=""
for _ in $(seq 1 180); do
  complete="$(kubectl -n "$NS" get job db-migrate-seed -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null || true)"
  failed="$(kubectl -n "$NS" get job db-migrate-seed -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}' 2>/dev/null || true)"
  [ "$complete" = "True" ] && { job_state=ok; break; }
  [ "$failed" = "True" ] && { job_state=failed; break; }
  sleep 5
done
if [ "$job_state" != "ok" ]; then
  kubectl -n "$NS" logs job/db-migrate-seed --all-containers --tail=60 || true
  die "the migration Job did not complete. api and web were NOT touched and still run the previous version."
fi

say "2/4  Rolling out api and web"
kubectl apply -f "$work/rendered.yaml"
if ! rollout_wait; then
  kubectl -n "$NS" get pods || true
  rollback
  die "the rollout did not become ready, rolled back."
fi

say "3/4  Checking the live site ($SITE_URL)"
if ! verify_live; then
  rollback
  die "the live check failed, rolled back."
fi

if $WRITE; then
  say "4/4  Recording $TAG in k8s/kustomization.yaml"
  sed -i.bak -E "s#(newTag: ).*#\1\"$TAG\"#" k8s/kustomization.yaml && rm -f k8s/kustomization.yaml.bak
  say "     (commit that change so the repository matches what is live)"
else
  say "4/4  Done. Tip: --write records the tag in k8s/kustomization.yaml so the repo matches what is live."
fi
say "Deployed $TAG:"; running_images | sed 's/^/  /'
