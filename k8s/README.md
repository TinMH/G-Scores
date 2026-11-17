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
kubectl apply -f k8s/namespace.yaml          # the Namespace is created once, outside kustomization.yaml
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

## 6. Automatic releases (tag -> live site)

After the first manual deploy, the site updates itself whenever you push a release tag:

```bash
git tag -a v1.2.3 -m "v1.2.3" && git push origin v1.2.3        # or: GitHub -> Releases -> Draft a new release (new tag)
```

`.github/workflows/release.yml` then runs: validate the tag (stable `vX.Y.Z`, commit must be on `main`) -> check cluster access ->
build and push `ghcr.io/tinmh/gscores-{api,seeder,web}:v1.2.3` -> migrate the database (seeder Job, idempotent) -> roll out api and web ->
smoke check + newman against `https://gscores.appforsell.com` -> create the GitHub Release with generated notes.
If the live verification fails, `api` and `web` are rolled back automatically (database migrations are not).

**One-time setup** (needs cluster-admin and a repo admin, so it is a script you run yourself):

```bash
bash scripts/setup-release-access.sh
```

It creates a ServiceAccount that can only manage this app's resources inside the `gscores` namespace (`k8s/rbac/deployer.yaml`: it cannot
read secrets or touch other namespaces) and stores its token, the API server URL and CA as secrets of the GitHub environment `production`.
Revoke it any time with `kubectl -n gscores delete secret github-deployer-token`.

Check the wiring without deploying anything: Actions -> Release -> Run workflow -> `check_only`.
Roll back or redeploy an older version: Actions -> Release -> Run workflow -> `version = v1.2.2` (its images already exist).

The API server must be reachable from GitHub's runners, which use changing public IPs; if you restrict it by IP, this cannot work.

## Notes

- **Data.** Postgres uses the default `microk8s-hostpath` StorageClass, whose reclaim policy is `Delete`: deleting the PVC or the
  namespace deletes the data. It can be rebuilt from the CSV in about 20 seconds (`kubectl -n gscores delete job db-migrate-seed`
  then `kubectl apply -k k8s`; the seeder is idempotent).
- **Update to a new build by hand.** (Normally just push a release tag, see step 6.) Bump `newTag` in `kustomization.yaml`, `kubectl delete job -n gscores db-migrate-seed --ignore-not-found`,
  then `kubectl apply -k k8s` (Jobs are immutable, so the old one has to go).
- **Remove everything.** `kubectl delete ns gscores` and `kubectl -n istio-system delete certificate gscores-appforsell`
  (and the DNS record).
