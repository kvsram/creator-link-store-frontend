# Creator Link Store Frontend

React + Vite client for the Creator Store admin and public storefront. It expects the API at `http://localhost:8080` during Vite development and runs at `http://localhost:5173`.

```bash
npm install
npm test
npm run dev
```

The admin starts at `/dashboard/` and implements Home, My Store, Success, Income, Analytics, Customers, Community, More, and Settings. The demo public page is `/alex`; an unknown handle displays registration. The UI is an original design informed by the supplied observable feature reference; it does not contain Stan source or branding.

Money is displayed as INR using Indian formatting and prices are sent as paise (`priceSubunits`). Real payment surfaces are explicitly labeled. A public purchase requests an idempotent server-side checkout; disabled/misconfigured providers show that no charge was attempted. Razorpay Checkout is loaded only after the API returns a real order, and Stripe is an optional redirect strategy.

For the complete three-container workflow, start with the [infrastructure repository](https://github.com/kvsram/creator-link-store-infrastructure). Its bootstrap script clones all missing siblings, validates the laptop, starts the three containers, and runs the supported-contract smoke test. Its feature-parity matrix is the source of truth for what is complete versus a UI/API foundation.

## Regional Kubernetes deployment

The three Kustomize overlays under `deploy/overlays` target separate regional clusters. The frontend is one low-resource replica per region behind that region's ingress. Its NGINX runtime proxies `/api` only to the API Service in the same cluster, so browser traffic stays regional.

GitHub Actions publishes a GHCR image for each `main` commit. Manual promotion uses protected GitHub Environments `dev`, `preprod`, and `prod`, short-lived AWS OIDC credentials, and a self-hosted runner labeled `aws-private` that can reach the private EKS API. Configure the regional variables documented in the infrastructure repository, then use **Deploy frontend** with the exact 40-character commit SHA. The workflow intentionally cannot deploy from a public GitHub-hosted runner.
