# Creator Link Store Frontend

React + Vite client for the Creator Store admin and public storefront. It expects the API at `http://localhost:8080` during Vite development and runs at `http://localhost:5173`.

```bash
npm install
npm run dev
```

The admin starts at `/dashboard/` and implements Home, My Store, Success, Income, Analytics, Customers, Community, More, and Settings. The demo public page is `/alex`; an unknown handle displays registration. The UI is an original design informed by the supplied observable feature reference; it does not contain Stan source or branding.

For the complete three-container workflow, clone the infrastructure repository beside this repository as `infrastructure` and follow its README.

## Regional Kubernetes deployment

The three Kustomize overlays under `deploy/overlays` target separate regional clusters. The frontend is one low-resource replica per region behind that region's ingress. Its NGINX runtime proxies `/api` only to the API Service in the same cluster, so browser traffic stays regional.

GitHub Actions publishes a GHCR image for each `main` commit. Create GitHub Environments `region-a`, `region-b`, and `region-c`, setting each `KUBECONFIG_B64` secret to the matching cluster credential. Then use **Deploy frontend** with the desired commit SHA.
