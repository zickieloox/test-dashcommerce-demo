# DashCommerce Starter

**The official starter template for [DashCommerce](https://github.com/emdashCommerce/dashcommerce)** — a production-ready Astro commerce site with Stripe checkout, subscriptions, blog, and full CMS control.

```sh
npm create @dashcommerce@latest
```

**[🚀 Live Demo](https://demo.dashcommerce.dev)** • EmDash 0.37 + @dashcommerce/core ^0.2.0

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/emdashCommerce/starter)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https://github.com/emdashCommerce/starter)

---

## Quick Start

Run the create command and follow the prompts:

```sh
npm create @dashcommerce@latest
```

The CLI will prompt for a project directory, download the starter, install dependencies, and commit. Then:

```sh
cd <your-project>
bun run bootstrap   # emdash init + merge-seed + seed (DB + 6 demo products)
bun run dev         # Astro at :4321
```

Open [http://localhost:4321](http://localhost:4321) — hero with "Enamel Mug" and a product grid. Paste your Stripe test keys at `/_emdash/admin/plugins/dashcommerce/settings` and you're exercising a real checkout in under a minute.

**Or clone directly:**

```sh
git clone https://github.com/emdashCommerce/starter
cd starter && bun install && bun run bootstrap && bun run dev
```

> **Powered by [DashCommerce](https://github.com/emdashCommerce/dashcommerce)** — a composable commerce plugin for EmDash CMS. Check out the [main repo](https://github.com/emdashCommerce/dashcommerce) for documentation, guides, and contributing info.

## What you get

**Storefront routes**

| Path | Purpose |
|---|---|
| `/` | Homepage with hero, featured products, blog teaser, value props |
| `/shop` | Full catalog grid with currency switcher |
| `/shop/[slug]` | Product detail: variant picker, price map, reviews, add-to-cart |
| `/products/[slug]` | Alias that resolves to `/shop/[slug]` |
| `/category/[slug]` | Products filtered by taxonomy |
| `/tag/[slug]` | Products filtered by tag |
| `/cart` | Full cart page with qty / coupon / shipping controls |
| `/checkout` | Address → Stripe Checkout (hosted) OR inline Payment Element (embedded) |
| `/thank-you/[draftId]` | Post-checkout polling screen — waits for `checkout.session.completed` |
| `/account` | Customer account landing + Stripe customer-portal link (email lookup) |
| `/orders/lookup` | Guest-order lookup by email + order number |
| `/subscriptions/[token]` | Self-service subscription management (pause, resume, cancel) |
| `/blog`, `/blog/[slug]`, `/blog/category/[slug]` | Blog (supports DashCommerce Portable Text blocks inline) |

**Admin**

Mounts alongside at `/_emdash/admin` with the full EmDash surface plus DashCommerce pages: Orders, Customers, Coupons, Shipping, Tax, Subscriptions, Reviews, Vendors, Menus, Reports, Settings — and the five dashboard widgets (Revenue, Low Stock, Recent Orders, Pending Reviews, Failed Renewals).

## Configure Stripe

1. Grab test keys from [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys).
2. Open `http://localhost:4321/_emdash/admin/plugins/dashcommerce/settings`.
3. Paste `stripeSecretKey` (sk_test_…) and `stripePublishableKey` (pk_test_…), click **Save all**.
4. In a second terminal, forward webhook events to your dev server:
   ```sh
   stripe listen --forward-to localhost:4321/_emdash/api/plugins/dashcommerce/checkout/webhook
   ```
   Copy the `whsec_…` the CLI prints → paste into Settings → `stripeWebhookSecret` → save.

### Exercise the checkout

1. Open any product from `/shop`, add to cart → drawer cart → **Checkout**.
2. Fill contact form → **Continue to payment**.
3. Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC.
4. Redirect lands on `/thank-you/…`. The page polls `/orders/by-draft?id=…` every 800ms until the webhook fires.
5. Check `/_emdash/admin/plugins/dashcommerce/orders` — order is listed with a green **Paid** badge.
6. Receipt email fires (check terminal for the console transport, or an inbox if SMTP is wired).

### Refund path

Open the order in admin → **Refund** → full or partial → confirm. Order flips to **Refunded** / **Partially refunded** and a refund email is sent.

### Subscriptions

Add `SUB-001` (Monthly Box) to cart → checkout. Stripe creates a Subscription with a 7-day trial. The `/subscriptions/[token]` page gives the customer self-service controls. `invoice.payment_succeeded` on cycle invoices triggers the renewal email; `invoice.payment_failed` starts the dunning flow.

## OAuth Authentication

The starter includes Google and GitHub OAuth for admin login. Admins are matched by verified email address — if an existing admin user's email matches the OAuth profile, EmDash links the account automatically on first login.

### Required environment variables

Set these as **Cloudflare Worker secrets** (for Workers deployment) or standard environment variables (for Node/Railway/Docker):

**Google OAuth:**
```sh
EMDASH_OAUTH_GOOGLE_CLIENT_ID=your-client-id
EMDASH_OAUTH_GOOGLE_CLIENT_SECRET=your-client-secret
```

**GitHub OAuth:**
```sh
EMDASH_OAUTH_GITHUB_CLIENT_ID=your-client-id
EMDASH_OAUTH_GITHUB_CLIENT_SECRET=your-client-secret
```

### Setting up OAuth providers

**Google Cloud Console:**
1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Navigate to **APIs & Services → Credentials**
3. Create **OAuth 2.0 Client ID** (Application type: Web application)
4. Add authorized redirect URI: `https://your-domain/_emdash/api/auth/oauth/google/callback`
   - For local dev: `http://localhost:4321/_emdash/api/auth/oauth/google/callback`
5. Copy the Client ID and Client Secret

**GitHub OAuth App:**
1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set Authorization callback URL: `https://your-domain/_emdash/api/auth/oauth/github/callback`
   - For local dev: `http://localhost:4321/_emdash/api/auth/oauth/github/callback`
4. Copy the Client ID and generate a Client Secret

### Cloudflare Workers secrets

For Cloudflare deployments, set secrets using `wrangler`:

```sh
echo "your-google-client-id" | wrangler secret put EMDASH_OAUTH_GOOGLE_CLIENT_ID
echo "your-google-client-secret" | wrangler secret put EMDASH_OAUTH_GOOGLE_CLIENT_SECRET
echo "your-github-client-id" | wrangler secret put EMDASH_OAUTH_GITHUB_CLIENT_ID
echo "your-github-client-secret" | wrangler secret put EMDASH_OAUTH_GITHUB_CLIENT_SECRET
```

Alternatively, set them in the Cloudflare Dashboard under **Workers & Pages → [Your Worker] → Settings → Variables**.

**Note:** Without these secrets configured, the OAuth buttons will appear on the login page but will fail with `OAuth provider <name> is not configured`.

## Demo seed catalog

Six products spanning every DashCommerce type:

| SKU | Title | Type | Notes |
|---|---|---|---|
| `MUG-001` | Enamel Mug | simple | Physical, priced in USD/EUR/GBP |
| `TEE-001` | Logo Tee | variable | Size + color variants |
| `BUNDLE-001` | Starter Bundle | grouped | Bundles MUG-001 + TEE-001 |
| `EXT-001` | Partner Good | external | Affiliate link, no cart action |
| `SUB-001` | Monthly Box | subscription | $29/mo, 7-day trial |
| `DIG-001` | Design Templates | simple + downloadable | Signed-URL token delivery |

Rebuild the seed from its TypeScript source with `bun .emdash/build-seed.ts`.

## Deploy

The starter builds for three targets from one codebase. `astro.config.mjs` branches on env vars. Choose your platform:

- **Cloudflare Workers** (D1 + R2) — serverless edge with sub-100ms global latency
- **Railway** (Node + Postgres) — full Node.js runtime with managed Postgres
- **Docker** — portable container for Fly, Render, ECS, Kubernetes, or bare metal

Click the deploy buttons at the top of this README or follow the platform-specific guides below.

### Cloudflare Workers (D1 + R2)

Runs on `@astrojs/cloudflare` + `@emdash-cms/cloudflare`. The starter stays multi-tenant — you bring your own D1/KV/R2 ids and pass them in as Worker **environment variables** at deploy time. A build-time patch script wires them into the adapter-generated config right before `wrangler deploy`.

**One-time resource provisioning:**

```sh
wrangler d1 create dashcommerce-demo                 # copy the database_id from output
wrangler r2 bucket create dashcommerce-demo-media
wrangler kv namespace create SESSION                 # copy the namespace id from output
openssl rand -hex 32 | wrangler secret put EMDASH_AUTH_SECRET
openssl rand -hex 32 | wrangler secret put EMDASH_PREVIEW_SECRET
```

**Set these env vars on the Worker project** (Cloudflare dashboard → Settings → Variables):

| Variable | From |
|---|---|
| `CF_D1_DATABASE_ID` | `wrangler d1 create` output |
| `CF_KV_SESSION_ID` | `wrangler kv namespace create` output |
| `CF_R2_BUCKET` | optional — overrides `dashcommerce-demo-media` |
| `CF_R2_PUBLIC_URL` | optional — public bucket URL for media |

**Seed the D1 database** (from your laptop, one time):

```sh
bun run cf:d1:seed       # dumps local SQLite → applies to D1
```

**Deploy** — either click the button or run locally:

```sh
CF_D1_DATABASE_ID=… CF_KV_SESSION_ID=… bun run cf:deploy
```

On CF's hosted build, the dashboard's deploy command should be:

```
npx wrangler deploy --config dist/server/wrangler.json
```

D1 migrations must run via wrangler before deploy (no runtime DDL on Workers).

### Railway (Node + Postgres + S3/R2)

Runs on `@astrojs/node` + any Postgres (Neon free tier works) + S3-compat storage (R2 or AWS). Env vars on the service:

```
DATABASE_URL=postgres://…
SITE_URL=https://your-domain
S3_BUCKET=…  S3_ENDPOINT=…  S3_ACCESS_KEY_ID=…  S3_SECRET_ACCESS_KEY=…
S3_REGION=auto  S3_PUBLIC_URL=https://pub-…
```

One-time seed against the remote DB:

```sh
railway run bun run bootstrap
```

Railway's filesystem is ephemeral — use Postgres, or mount a volume at `/data` and set `SQLITE_URL=file:/data/data.db`.

### Docker

Local run with `docker compose up` from the repo root — storefront at [localhost:4321](http://localhost:4321), SQLite + uploads on named volumes:

```sh
docker compose up
docker compose exec app bun run bootstrap
```

The same image deploys anywhere (Fly, Render, ECS, Kubernetes, bare metal):

```sh
docker build -t ghcr.io/you/dashcommerce .
docker run -p 4321:4321 \
  -e SITE_URL=https://your-domain \
  -e DATABASE_URL=postgres://…   # optional; defaults to SQLite in /data
  -v dashcommerce_data:/data \
  -v dashcommerce_uploads:/app/packages/starter/uploads \
  ghcr.io/you/dashcommerce
```

Swap SQLite for Postgres by uncommenting the `db` service in `docker-compose.yml` and setting `DATABASE_URL`.

## Customizing

This is a *starting point*, not a framework. Everything is standard Astro — edit freely.

- **Layout + brand:** `src/layouts/Shop.astro`, `src/components/Header.astro`, `src/styles/global.css`
- **Homepage sections:** admin under **Pages → Home** (hero, featured grid, blog teaser, value props)
- **Nav / footer:** admin under **DashCommerce → Menus** (nested up to 4 levels, with mega-menu columns)
- **Product tile + detail:** the starter copies components out of `@dashcommerce/core/astro/components/*`; edit the local copies freely, or drop in your own

The plugin itself is `@dashcommerce/core` on npm. Don't fork it — customize at the site level and file an issue if the core needs to change.

## License

MIT, same as DashCommerce.
