# Forma

A mobile-first store for a small catalogue. Customers browse products, check out with a delivery address, and pay with Razorpay. The store owner manages products and orders in an admin dashboard, gets an email when a payment is captured, and can see which ad campaign an order came from.

The repository is split in two:

- `frontend` — Next.js App Router, React, TypeScript, Tailwind CSS
- `backend` — Express, Prisma, PostgreSQL

Payment secrets, price calculation, stock reservation, and webhook verification stay on the server. The browser never decides that an order is paid.

## What is included

- Home, product listing, and slug product pages
- Checkout with name, email, mobile, and a full Indian delivery address
- Razorpay order creation, Checkout, signature verification, and webhooks
- Success, pending, and failure pages that read payment status from the API
- Privacy, terms, shipping, and cancellation pages
- Admin login, catalogue, orders, customers, payments, and campaign reporting
- Resend order emails for the customer and the store owner
- Meta Pixel (after consent) and a Conversions API purchase event after a captured payment
- UTM parameters and `fbclid` stored on the order

## Local setup

Requirements: Node.js 20 or newer, and PostgreSQL 16.

The backend loads `backend/.env` on startup when that file exists. Variables already set in the host environment are left unchanged.

```powershell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
```

Edit both files. For a local database you can create a role and database:

```sql
CREATE ROLE forma LOGIN PASSWORD 'forma' CREATEDB;
CREATE DATABASE forma OWNER forma;
```

`CREATEDB` is only needed so Prisma Migrate can create its shadow database during development. Production uses `prisma migrate deploy`, which does not need it.

If you use Docker instead, `docker compose up -d` starts Postgres on port **5433**. Point `DATABASE_URL` and `DIRECT_URL` at `localhost:5433`.

Then:

```powershell
npm install --prefix backend
npm install --prefix frontend
npm run db:setup --prefix backend
npm run dev --prefix backend
npm run dev --prefix frontend
```

The API listens on http://localhost:4000 and the site on http://localhost:3000.

`npm run db:setup` applies migrations and seeds an admin plus sample products. Seeding does not overwrite an existing admin password or an existing product slug.

The seed admin email is `SEED_ADMIN_EMAIL` (default `admin@forma.local`). Set `SEED_ADMIN_PASSWORD` to at least 10 characters before seeding. A local development password of `ChangeMe-Admin-123` is only for a private machine. Change it before the site is reachable by anyone else. Production seeding refuses that placeholder.

## Environment variables

Backend placeholders live in `backend/.env.example`. Frontend placeholders live in `frontend/.env.example`. Do not commit real values.

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | Supabase → Project Settings → Database. Use the pooler connection for the running API. |
| `DIRECT_URL` | The direct Postgres connection (port 5432). Prisma Migrate uses this. |
| `ADMIN_JWT_SECRET` | Generate a long random string. It signs the admin cookie. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Settings → API Keys. Start in Test Mode. |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard → Settings → Webhooks, on the endpoint you create. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend → API Keys, after a verified sender domain. |
| `OWNER_EMAIL` | The inbox that should receive new paid-order mail. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API. The service role key stays on the server. |
| `META_PIXEL_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | Meta Events Manager → your pixel. |
| `META_CAPI_ACCESS_TOKEN` | Events Manager → Settings → Conversions API. Server only. |
| `META_TEST_EVENT_CODE` | Events Manager → Test events, while you are testing. Remove it in production. |

`NEXT_PUBLIC_API_URL` is the browser-visible API origin, for example `http://localhost:4000` or `https://forma-api.onrender.com`.

When the site and API are on different HTTPS hosts, set `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`, and set `ALLOWED_ORIGINS` to the exact site origin. On local HTTP, keep `lax` and `COOKIE_SECURE=false`.

If a credential is empty, that feature is skipped and the API explains what to set:

- Checkout can still create an order, but opening Razorpay returns HTTP 503 until the key id and secret are set.
- Emails are not sent until `RESEND_API_KEY` and `EMAIL_FROM` are set. The order is still marked paid. Admin order detail shows whether each email was sent. A later webhook retry sends mail once the keys exist.
- Image file upload returns HTTP 503 until Supabase Storage is configured. You can still save a product with an HTTPS image URL.
- The Meta purchase event is skipped until the pixel id and Conversions API token are set. A captured payment is not rolled back because of that.

## Payments

Prices and shipping are calculated from the database. The browser cannot submit a price. Stock is reserved inside a transaction with `UPDATE ... WHERE stock >= quantity`, in a stable product order, and restored if an unpaid order is cancelled or left unpaid for `RESERVATION_MINUTES` (default 30). The release job runs every five minutes inside the API process.

Flow:

1. `POST /api/orders` validates the address, re-reads prices, reserves stock, and stores attribution.
2. `POST /api/payments/create-order` creates a Razorpay order for that exact total and stores the Razorpay order id.
3. The site opens Razorpay Standard Checkout.
4. `POST /api/payments/verify` checks the signature with a constant-time compare, then fetches the payment from Razorpay and marks the order paid only when the status is `captured` and the amount matches.
5. `POST /api/payments/webhook` verifies the raw-body signature. `payment.captured` and `order.paid` use the same idempotent update. `payment.failed` records the failure and can email the customer. Duplicate event ids do not reserve stock again, send a second receipt, or send a second purchase event.

The success page polls `GET /api/orders/:orderNumber`. It does not mark anything paid.

### Razorpay webhook

In Test Mode, create a webhook for:

`https://<your-api-host>/api/payments/webhook`

Subscribe to `payment.captured`, `payment.failed`, and `order.paid`. Paste the signing secret into `RAZORPAY_WEBHOOK_SECRET`.

Locally, Razorpay cannot reach `localhost`. Use a tunnel and the same path, or rely on the verify step while testing. Use the test cards and UPI ids from [Razorpay’s test payment documentation](https://razorpay.com/docs/payments/payments/test-card-upi-details/). Do not use live keys or real money until the webhook, emails, and stock behaviour have been checked in Test Mode.

Card numbers and CVV are never stored. Payment rows keep the Razorpay order id, payment id, method, amount, and status.

## Email

Resend is called from the API after a captured payment:

- Customer: order number, lines, amount, payment status, delivery address
- Owner: customer contact, address, lines, amount, Razorpay payment id, and a link to the admin order

Send claims are stored on the order, so a retried webhook does not send a second copy. If Resend is down, the claim is released and the next retry can send.

Until a domain is verified, Resend only delivers to the account email address. Use a verified domain before customers rely on these messages. `EMAIL_FROM` must be an address on that domain.

## Meta ads

Landing links can include `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, and `fbclid`. The storefront keeps them in local storage and sends them with the order, including the Meta `_fbp` and `_fbc` cookies when they exist.

The pixel loads only after the visitor accepts the consent banner. It sends PageView, ViewContent, AddToCart, InitiateCheckout, and Purchase with INR values. Purchase is also sent from the server, and only for a captured payment, with the same event id so Meta can deduplicate. Pending and failed orders are not reported as purchases.

Set `META_GRAPH_VERSION` if Meta retires the default. A failed Conversions API call does not undo the payment; it is logged and retried on the next webhook delivery.

## Admin

Open http://localhost:3000/admin/login. The session is an HTTP-only cookie. Admin routes reject missing or non-admin tokens. Browser requests that change data must come from `ALLOWED_ORIGINS`.

Fulfillment can be set to processing, shipped, delivered, or cancelled. Cancelling an unpaid order returns stock. Cancelling a paid order does not refund it; refund that payment from the Razorpay dashboard.

## Tests

```powershell
npm test --prefix backend
```

The suite covers pricing, validation, Razorpay and webhook signatures, duplicate webhook claims, stock reservation, payment capture and amount mismatch, admin cookie authorization, email idempotency, and Meta purchase gating. If `DATABASE_URL` is set, it also runs a Postgres test that two concurrent orders cannot buy the last unit and that a later product price change does not rewrite the order.

## Deployment

This Next.js app uses server rendering for product pages, so it is not a Cloudflare Pages static export. Host the frontend on a Node host that runs `next start` (Render or Vercel). Host the API on Render or another Node host. Use Supabase for Postgres and for a public Storage bucket named `product-images`.

`render.yaml` describes two free web services. Set the secret environment variables in the host. Build the API with:

```text
npm install && npx prisma generate && npx prisma migrate deploy
```

Start it with `npm start`. The health check is `GET /api/health`.

Run the seed once from a shell after the first migration, not on every deploy:

```text
node prisma/seed.js
```

Set `NEXT_PUBLIC_*` values before the frontend build. They are baked in at build time.

Use HTTPS for both hosts. Point the Razorpay webhook at the public API URL.

### Free-tier limits

Do not treat the free tiers as a production ad stack.

- **Supabase free** projects pause after about a week without activity. The database size, connection count, and storage are small, and the free plan is not a backup strategy. A paused database takes the shop offline. Upgrade and confirm backups before spending on ads.
- **Render free** web services sleep after inactivity. The first visitor waits through a cold start, and the free hours cap can stop the service. Sleep also delays webhooks and the stock-release job. Use an always-on plan before a campaign.
- **Resend free** has a low monthly send cap, and unverified domains cannot mail customers.
- **Razorpay test mode** does not move real money. Live mode needs completed KYC and live keys.
- **Vercel Hobby**, if you use it for the frontend, has its own commercial-use rules. Check the current plan terms before selling.
- Free-tier availability changes. Confirm the current limits in each vendor’s dashboard before launch.

## Security notes

- Secrets stay in environment variables.
- Admin cookies are HTTP-only. They are `Secure` in production or when `SameSite=None`.
- Inputs are validated with Zod. Prisma uses parameterized queries.
- Public product routes only return active products. The public order lookup needs the unguessable order number and does not return the customer email or phone.
- Helmet, CORS allow-list, and rate limits are enabled. Webhook processing uses the raw body.
- Customer, order, and payment tables have row level security enabled with no public policies, so the Supabase Data API cannot read them. The Prisma connection uses the table owner, which is the intended server path.
- Logs are JSON and redact fields whose names look like secrets, passwords, cards, or tokens.
