# Creator Link Store Frontend

React + Vite client for the Creator Link Store MVP. It expects the API at `http://localhost:8080` and runs at `http://localhost:5173`.

```bash
npm install
npm run dev
```

The public page is `/alex`; visit an unknown handle to display the creator registration form.

## Regional Kubernetes deployment

The three Kustomize overlays under `deploy/overlays` target separate regional clusters. The frontend is one low-resource replica per region behind that region's ingress. Its NGINX runtime proxies `/api` only to the API Service in the same cluster, so browser traffic stays regional.

GitHub Actions publishes a GHCR image for each `main` commit. Create GitHub Environments `region-a`, `region-b`, and `region-c`, setting each `KUBECONFIG_B64` secret to the matching cluster credential. Then use **Deploy frontend** with the desired commit SHA.
