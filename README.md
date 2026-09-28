# SKINIFY — Try it. Before you buy it.

SKINIFY is an AR commerce platform: brands turn products into **Skinners** (browser-based AR try-on experiences) and share them anywhere with a link, QR code or embed; customers discover products and try them on with their camera — no app, no account.

> SKINIFY is **not** a skin-analysis, dermatology or skincare product. It performs no diagnosis or medical analysis of any kind.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 15 (App Router, React 19, TypeScript), deployed on Vercel |
| Database | PostgreSQL (Neon in production; any Postgres locally) via `postgres` driver |
| File storage | Vercel Blob (client uploads up to plan limit; server-side optimisation) |
| AR tracking | MediaPipe Tasks Vision (hand / face / pose / segmentation), on-device, WebGL/WASM |
| Rendering | Three.js (PBR materials, Draco + Meshopt decoding, depth occluders, camera-based light estimation) |
| 3D pipeline | glTF-Transform + meshoptimizer (validate → inspect → dedup/prune → compress) |
| Billing | Stripe Checkout + signed webhooks (optional — disabled until keys are set) |

## Project layout

```
app/(site)          customer pages: home, explore, categories, brands, product, brand store, saved, pricing, docs
app/s/[slug]        public Skinner link (full-screen AR)      app/embed/[slug]  iframe embed
app/try/[b]/[p]     readable alias → /s/[slug]                 app/(auth)        login / signup
app/onboarding      seller onboarding (brand → first Skinner)  app/dashboard/*   seller studio
app/admin           platform admin                             app/api/*         JSON APIs (+ /api/v1 public API)
lib/ar/*            BODY-PART AR TRACKING ENGINE (config, vision loader, solvers, filters, nails, engine, viewer)
lib/server/*        db, auth, sessions, rate limit, storage, GLB validation, entitlements, links, analytics
db/schema.sql       full schema     scripts/migrate.mjs, scripts/seed.ts
```

## Local development

```bash
npm install
cp .env.example .env.local        # set DATABASE_URL (any Postgres 14+)
npm run db:migrate                # creates tables (idempotent)
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='choose-a-strong-one' DEMO_SELLER_PASSWORD='another-one' npm run db:seed
npm run dev                       # http://localhost:3000
```

Camera access requires HTTPS or `localhost`. Uploads are stored in `.data/` locally when no Blob token is configured.

## Deploying to Vercel

1. **Database** — create a Neon project (or use Vercel → Storage → Neon). Copy the **pooled** connection string.
2. **Blob** — Vercel → Storage → Create → Blob, connect it to the project (sets `BLOB_READ_WRITE_TOKEN`).
3. **Environment variables** (Project → Settings → Environment Variables):
   - `DATABASE_URL` (required) · `NEXT_PUBLIC_SITE_URL` (required, e.g. `https://skinify.vercel.app`)
   - `BLOB_READ_WRITE_TOKEN` (required for seller uploads)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (optional; set a `stripe_price_id` per plan in Admin → Plans)
4. **Migrate + seed** once from your machine against the production database:
   ```bash
   DATABASE_URL='postgres://…pooler…/neondb?sslmode=require' npm run db:migrate
   DATABASE_URL='…' ADMIN_EMAIL=… ADMIN_PASSWORD=… DEMO_SELLER_PASSWORD=… npm run db:seed   # SEED_DEMO=false to skip demo brands
   ```
5. **Deploy** — `vercel deploy --prod` (or push to the connected Git repo). Build command `npm run build`, output is the Next.js default, Node 20+.
6. Stripe webhook endpoint: `https://<domain>/api/billing/webhook` with events `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Only a signature-verified webhook activates a paid plan.

### Production notes

- Rate limiting is in-memory per serverless instance (good against bursts, not a global quota). For strict global limits, swap `lib/server/ratelimit.ts` for Upstash Redis.
- MediaPipe WASM is copied to `/public/mediapipe` at build time; task models load from Google's CDN by default (override with `NEXT_PUBLIC_MP_*`).
- Camera frames never leave the device. Photos/videos are only saved when the customer taps save/share, and are never uploaded to SKINIFY.

## Feature status (honest)

See the in-app `/how-it-works` page and the final build report. Summary:

- **Fully functional:** discovery/search/filters, product & brand pages, favourites (local), live AR for rings, watches, bracelets, glasses, earrings, lipstick, nails, hats, necklaces, bags, surface placement; photo/video capture and native share; seller signup, brands, 7-step Skinner wizard, GLB upload/validation/optimisation, live preview, publish/unpublish/duplicate/delete, links, QR (SVG/PNG/print), iframe embed + SDK button, real analytics, configurable plans and limits, expiry handling, admin moderation, API keys + `/api/v1`.
- **Requires external service:** online card payments (Stripe keys), seller uploads on Vercel (Blob token).
- **Experimental:** 2D garment overlay on body (segmentation-based, not a true cloth simulation), shoes (pose-based ankle anchoring, low precision).
