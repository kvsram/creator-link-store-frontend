# Creator Link Store Frontend

React + Vite client for the Creator Store admin and public storefront. It expects the API at `http://localhost:8080` during Vite development and runs at `http://localhost:5173`.

```bash
npm install
npm test
npm run dev
```

The admin starts at `/dashboard/` and implements Home, My Store, Success, Income, Analytics, Customers, Community, More, and Settings. The demo public page is `/alex`; an unknown handle displays registration. The UI is an original design informed by the supplied observable feature reference; it does not contain Stan source or branding.

The authenticated dashboard uses an original cinematic dark interface: a creator-focused Home spotlight, compact navigation, high-contrast content cards, restrained hover motion, accessible focus states, and a mobile bottom navigation. The theme is scoped to the admin shell; creators' phone previews and public storefront themes remain independently customizable.

**My Store** separates storefront authoring into three focused views. **Store** manages offers, **Landing Pages** edits the public headline and visible sections, and **Edit Design** controls theme, accent color, background, button shape, and typography. The add-product dialog uses visual cards for all eight offer types and shows a live phone preview while the creator changes category, title, or price. Landing and design settings are persisted through the backend rather than existing only in browser state.

Product/service and promotion management rows expose Pin/Unpin alongside their edit, delete, and ordering controls. The live phone preview also exposes Pin/Unpin, so creators can highlight offers from either surface. Pinning persists on the server and moves published hot deals to the top of the combined phone-preview and customer-storefront feed. Draft offers display “Publish first” because unpublished content cannot appear to customers. Editing supports category, title, description, price, and draft/published status. Delete requires confirmation, and API conflicts are shown when commerce history requires the creator to unpublish instead.

The product modal is a conditional Stan-style builder rather than one generic form. All products share storefront-thumbnail and checkout sections; downloads/lead magnets add upload or redirect delivery, meetings add availability, webinars add event capacity and timing, courses add modules/lessons/video and supporting assets, memberships add recurrence, and custom/community products add their fulfillment/access settings. These values and file metadata are saved through authenticated backend APIs rather than remaining browser-only.

The ninth visual item type, **Promotion / external link**, is an outbound offer rather than a checkout product. Creators can store brand, image URL, CTA, offer text, coupon, disclosure, schedule, publication state and order; they can edit, delete, and move promotions from My Store. The public card records an eligible click before redirecting to the merchant, and Analytics reports per-promotion clicks. Both server and browser require HTTPS destinations.

Money is displayed as INR using Indian formatting and prices are sent as paise (`priceSubunits`). Real payment surfaces are explicitly labeled. A public purchase requests an idempotent server-side checkout; disabled/misconfigured providers show that no charge was attempted. Razorpay Checkout is loaded only after the API returns a real order, and Stripe is an optional redirect strategy.

For the complete three-container workflow, start with the [infrastructure repository](https://github.com/kvsram/creator-link-store-infrastructure). Its bootstrap script clones all missing siblings, validates the laptop, starts the three containers, and runs the supported-contract smoke test. Its feature-parity matrix is the source of truth for what is complete versus a UI/API foundation.

## Regional Kubernetes deployment

The three Kustomize overlays under `deploy/overlays` target separate regional clusters. The frontend is one low-resource replica per region behind that region's ingress. Its NGINX runtime proxies `/api` only to the API Service in the same cluster, so browser traffic stays regional.

GitHub Actions publishes a GHCR image for each `main` commit. Manual promotion uses protected GitHub Environments `dev`, `preprod`, and `prod`, short-lived AWS OIDC credentials, and a self-hosted runner labeled `aws-private` that can reach the private EKS API. Configure the regional variables documented in the infrastructure repository, then use **Deploy frontend** with the exact 40-character application commit SHA plus the exact infrastructure SHA already applied to that stage. The workflow verifies the SSM release contract, copies the image to environment ECR, and only then rolls out. It intentionally cannot deploy from a public GitHub-hosted runner.
