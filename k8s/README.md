# Deploying G-Scores to the MicroK8s cluster

Target: `https://gscores.appforsell.com`. Traffic path:

```
browser -> Cloudflare (proxied A record) -> Istio ingress gateway (node IP, :80/:443)
        -> Gateway + VirtualService (k8s/istio.yaml) -> web (nginx: SPA + /api) -> api -> postgres
```

The images are public on GHCR (`ghcr.io/tinmh/gscores-{api,seeder,web}`), so no pull secret is needed. `kustomization.yaml`
pins them to a commit tag; change `newTag` to deploy another build.

## 1. Cloudflare (once)

| | |
|---|---|
| DNS record | Type `A`, name `gscores`, IPv4 = the node's public IP (the one the Istio ingress gateway uses), **Proxied** |
| SSL/TLS mode | **Full (strict)** |

Port 80 on the gateway redirects to HTTPS, so "Flexible" would redirect-loop. Certificates are issued by cert-manager with
DNS-01 through Cloudflare, so it works with the proxy on.

## 2. Certificate (takes ~1-2 minutes)

```bash
kubectl apply -f k8s/tls/certificate.yaml
kubectl -n istio-system get certificate gscores-appforsell -w        # wait for READY=True, then Ctrl+C
```

It lives in `istio-system` because that is where the gateway looks up `credentialName` secrets.

## 3. Namespace and database secret

```bash
kubectl apply -f k8s/namespace.yaml
kubectl -n gscores create secret generic gscores-db \
  --from-literal=DB_PASSWORD="$(openssl rand -base64 24 | tr -d '=+/')"
```

The password is never stored in the repository. Without this secret the Postgres, API and seed pods stay in
`CreateContainerConfigError`.

## 4. Apply the app and wait for the data load

```bash
kubectl apply -k k8s
kubectl -n gscores wait --for=condition=complete job/db-migrate-seed --timeout=900s   # loads 1,061,605 rows
kubectl -n gscores rollout status deployment/api
kubectl -n gscores rollout status deployment/web
```

## 5. Verify

```bash
curl -s https://gscores.appforsell.com/api/health                      # {"status":"ok"}
cd testing && npm ci && npm test -- --env-var baseUrl=https://gscores.appforsell.com/api --env-var maxResponseMs=4000
```

Then set the repository variable `LIVE_URL` to `https://gscores.appforsell.com` so CI runs the same checks after each deploy.

## Notes

- **Data.** Postgres uses the default `microk8s-hostpath` StorageClass, whose reclaim policy is `Delete`: deleting the PVC or the
  namespace deletes the data. It can be rebuilt from the CSV in about 20 seconds (`kubectl -n gscores delete job db-migrate-seed`
  then `kubectl apply -k k8s`; the seeder is idempotent).
- **Update to a new build: one command.** CI never deploys; after the CI run on `main` has published its images (a push
  runs tests, then pushes `ghcr.io/tinmh/gscores-*:<full commit sha>`), run from the repo root:
  ```bash
  bash scripts/deploy.sh --dry-run     # shows what is running now and what would change; touches nothing
  bash scripts/deploy.sh               # deploys the current origin/main (asks for confirmation)
  bash scripts/deploy.sh <tag>         # deploys a specific image tag instead
  bash scripts/deploy.sh --rollback    # goes back to the previous version of api and web
  ```
  It uses your own `kubectl` context (no cluster credential is stored on GitHub) and stops at the first problem: it checks the
  context and that the images exist on GHCR, runs the migration Job **first** (if that fails, api and web are untouched), rolls
  out `api` and `web`, then runs the smoke check on the live site; a failed rollout or live check rolls back automatically.
  Add `--write` to record the deployed tag in `k8s/kustomization.yaml` (then commit it), `--no-verify` to skip the live check,
  `--yes` to skip the confirmation. Database migrations are never rolled back, so keep them backwards compatible.
  The check needs `jq`; without it the script falls back to a health check only.
- **By hand, if you prefer.** Bump `newTag` in `kustomization.yaml`, `kubectl delete job -n gscores db-migrate-seed --ignore-not-found`,
  then `kubectl apply -k k8s` (Jobs are immutable, so the old one has to go).
- **Remove everything.** `kubectl delete ns gscores` and `kubectl -n istio-system delete certificate gscores-appforsell`
  (and the DNS record).
