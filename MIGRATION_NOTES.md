# Migration Notes — Assam Wild Safari: static site → Next.js

This document summarizes the rewrite from the static HTML/CSS/JS site (in
`../assam-fixed`, untouched by this work) into this Next.js 16 (App Router,
TypeScript) project.

## 1. The core security fix (why this rewrite exists)

The old site hardcoded a Supabase **service_role** JWT (a full RLS-bypass
admin key) directly in client-side `<script>` blocks in 6+ public HTML files
(`index.html`, `admin.html`, `booking.html`, `reviews.html`,
`car-rental.html`, `itineraries.html`). Anyone opening devtools had full
read/write/delete access to every table. The admin panel's "auth" was a
hardcoded password string (`const PASS = 'assamwild2026'`) compared in
browser JS, gated only by `sessionStorage` — trivially bypassable.

This rewrite fixes both:

- **`SUPABASE_SERVICE_ROLE_KEY`** lives only in `.env.local` (gitignored,
  never committed) and is read only inside `lib/supabase-server.ts`
  (`supabaseAdmin()`), which is imported only by Route Handlers under
  `app/api/**`. That module starts with `import 'server-only'`, so any
  accidental import from a Client Component fails the build.
- **`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`** are the only
  Supabase credentials that ever reach the browser bundle, used only for
  genuinely public data. In practice, all reads in this app are done
  server-side in React Server Components via `lib/supabase-public.ts`
  (`supabasePublic()`), so the anon key mostly isn't even shipped to the
  client — it's a defence-in-depth fallback, not the primary read path.
- **Admin auth is now real**: NextAuth v5 (`lib/auth.ts`) with a Credentials
  provider that `bcrypt.compare()`s the submitted password against
  `ADMIN_PASSWORD_HASH` (a bcrypt hash, never a plaintext secret) — the
  comparison happens server-side inside `authorize()`, never in the browser.
  Sessions are signed, httpOnly JWT cookies. `proxy.ts` (Next.js 16 renamed
  `middleware.ts` → `proxy.ts`; same mechanism) gates every request to
  `/admin/**`, `/api/admin/**` and `/api/files/**` server-side — a client
  bypass cannot skip this, unlike the old `sessionStorage` check.
- **All admin CRUD** (confirm bookings, approve/delete reviews, vehicles,
  trending itineraries, drop rates, car rental status) goes through
  `app/api/admin/**` Route Handlers using the service-role client — never a
  direct client-side Supabase call with an elevated key.
- **All public writes** (booking submission, review submission, car-rental
  enquiry) go through `app/api/bookings`, `app/api/reviews`,
  `app/api/car-rental` — validated server-side with Zod schemas
  (`lib/schemas.ts`) before insert, using the service-role client. The
  browser never inserts directly into Supabase.

## 2. What was ported 1:1

- **Visual design**: colors, fonts (Bebas Neue / DM Sans), spacing, section
  layout, copy — carried over verbatim from `reference-style.css` and
  `reference-index.html` into `app/globals.css` and `app/page.tsx`. Same
  hero, marquee, stats counters, intro section, tour package cards (all 10,
  full text), park selection cards, cancellation policy box, CTA section,
  testimonials/trending carousels, footer.
- **Images**: copied from `reference-images/` into `public/images/`.
- **i18n**: `reference-js/lang.js`'s full translation dictionary (12
  languages: English, Hindi, Assamese, Bengali, Tamil, Telugu, Marathi,
  Gujarati, Odia, Punjabi, Kannada, Malayalam) was extracted into
  `lib/i18n/translations.ts` with **full 203/203 key parity in every
  language** — see `lib/i18n/lang-coverage-report.json` for the coverage
  audit. Delivered via React Context (`lib/i18n/I18nProvider.tsx`,
  `useTranslation()`/`useI18n()`) instead of the original's manual DOM
  rewriting. The first-visit language splash and floating "change language"
  button are ported in `components/LanguageSplash.tsx`.
- **Shared UI behavior** from `reference-js/main.js`: custom cursor, navbar
  scroll state, hamburger drawer, scroll-reveal animations, animated
  counters, carousel arrow wiring, toasts — ported to
  `hooks/useScrollReveal.ts` (`useGlobalUiEffects`, `wireCarouselArrows`) and
  `components/Toast.tsx`, mounted once in `app/layout.tsx` via
  `components/PageEffects.tsx`.
- **Booking flow logic**: park pricing (`calcTotal` — shared-vs-private jeep
  breakpoints at 3/6 adults), time slots, and the Manas Tuesday-closure rule
  ported verbatim into `lib/booking-data.ts` from booking.html's inline
  `<script>`.
- **File upload/download logic**: the Netlify Function folder allowlist
  (`screenshots`, `aadhaar`) and 15MB size cap from
  `reference-netlify-functions/functions/{upload-file,get-file}.js` is
  preserved in `app/api/upload/route.ts` and `app/api/files/[...key]/route.ts`,
  just re-targeted at a private Supabase Storage bucket instead of Netlify
  Blobs, and the download route now requires an authenticated admin session
  (the old Netlify function had no auth check at all).
- **DB schema**: `reference-db-schema.sql`'s `bookings` and `reviews` tables
  are unchanged in shape; `supabase/migrations/0001_rls_and_razorpay.sql` is
  purely additive (Razorpay columns, missing tables the admin/car-rental
  pages already relied on, and hardened RLS — see below).

## 3. What changed structurally

- **Framework**: static HTML/CSS/vanilla JS → Next.js 16 App Router +
  TypeScript + React 19. Pages are now Server Components by default; forms
  and stateful flows (`app/booking/page.tsx`, `components/*Form.tsx`,
  admin dashboard pages) are Client Components.
- **Data fetching**: homepage/itineraries/reviews/car-rental now fetch
  trending itineraries, approved reviews, active vehicles and active drop
  rates **server-side** in Server Components (`lib/supabase/reads.ts`),
  instead of a client-side `fetch` + `innerHTML` rewrite after page load.
  This also means these lists are in the initial HTML (no flash of empty
  state) and never expose any Supabase key to the browser for these reads.
- **Payments**: the old manual "scan UPI QR code, upload a screenshot,
  admin manually verifies" flow has been **fully removed** (update: as of
  this pass, not just deprioritized — see below). Razorpay is now the only
  payment path for safari bookings:
  - `app/api/razorpay/create-order/route.ts` creates a Razorpay order
    server-side.
  - The client opens Razorpay Checkout (loaded via `next/script`) using
    only the public `NEXT_PUBLIC_RAZORPAY_KEY_ID` + the returned `order_id`.
  - `app/api/razorpay/verify/route.ts` verifies the HMAC-SHA256 signature
    server-side (`hmac_sha256(order_id + "|" + payment_id, key_secret)`,
    using `crypto.timingSafeEqual` for the comparison) and only then flips
    `bookings.payment_status` to `'paid'`. A client-side "payment succeeded"
    callback is never trusted alone — confirmation UI only renders after
    the verify call returns success.
  - `app/api/razorpay/webhook/route.ts` — a second, independent
    confirmation path. Configure this URL in the Razorpay Dashboard
    (Settings → Webhooks → event `payment.captured`) once deployed. It
    verifies Razorpay's own webhook signature (`RAZORPAY_WEBHOOK_SECRET`, a
    *different* secret from `RAZORPAY_KEY_SECRET`) and idempotently flips
    `awaiting_payment` → `paid` for the matching `razorpay_order_id`. This
    covers the case where a guest pays successfully but the browser never
    calls `/verify` (closed tab, dropped connection, crash) — without the
    webhook, that booking would stay stuck at `awaiting_payment` forever
    even though Razorpay actually captured the payment. Not strictly
    required for the happy path to work, but treated as part of "done
    properly" for real money — the two paths are independent and both
    idempotent, so receiving both (or Razorpay retrying the webhook) is
    safe.
  - The old manual QR/screenshot path — `payment_method: 'qr'`,
    `screenshot_path`, and the `'pending_confirmation'` status — has been
    removed from the application code entirely: `lib/schemas.ts`,
    `app/api/bookings/route.ts`, `lib/upload-client.ts`, and
    `app/api/upload/route.ts` (the `"screenshots"` folder was dropped from
    the upload allowlist) no longer reference it. A new booking is created
    with `payment_status: 'awaiting_payment'` and only ever becomes `'paid'`
    via `/verify` or the webhook. The admin bookings screen's manual
    "Confirm" action is now only available once a booking is already
    `'paid'` — previously it could confirm an unpaid booking, which made
    sense when admin review *was* the payment check, but not now that
    Razorpay verification is authoritative. `bookings.screenshot_path` is
    left in the database schema (dropping a column is a destructive,
    unnecessary step for a column the app just no longer writes to).
  - Car-rental enquiries are **unaffected** — that flow was never an online
    payment in the original site (it submits an enquiry, then opens a
    pre-filled WhatsApp message to the operator) and stays that way. The
    unused `upi_ref`/`payment_screenshot_url` columns on
    `car_rental_bookings` (from the migration's schema-inference pass) are
    harmless dead columns, not an active code path.
- **Admin panel**: 6 static HTML `<script>`-driven tabs →
  `app/admin/(protected)/{bookings,reviews,car-rentals,vehicles,trending,drop-rates}/page.tsx`,
  each a small Client Component calling its own `app/api/admin/**` Route
  Handler (list/create/update/delete), all gated by `proxy.ts` + NextAuth.
- **Icons**: the reference site loads `lucide` from a CDN `<script>` tag and
  calls `lucide.createIcons()` after every DOM mutation. This app keeps that
  same CDN-script approach in `app/layout.tsx` (polls for `window.lucide`
  and calls `createIcons()`) for the pages that were ported with inline
  icon markup, and the `lucide-react` npm package is also installed as an
  available alternative for any component that wants React-native icons
  instead — not fully unified across every component in the interest of
  time.

## 4. Known gaps / not fully replicated (be aware before shipping)

- **i18n coverage is now complete for every page's chrome** (update: done in
  a follow-up pass) — `components/Navbar.tsx`, `components/Footer.tsx`, and
  every page body (`components/HomeContent.tsx`,
  `components/ItinerariesContent.tsx`, `components/ReviewsContent.tsx`,
  `components/CarRentalContent.tsx`, plus `ReviewForm`/`CarRentalForm`
  labels) now call `t(...)` for section labels, headings, form labels and
  buttons, using the existing key set in `lib/i18n/translations.ts` (12
  languages, already had full coverage for every key used — no new
  translation content was needed). Each Server Component page
  (`app/page.tsx`, `app/itineraries/page.tsx`, `app/reviews/page.tsx`,
  `app/car-rental/page.tsx`) is now a thin data-fetching wrapper around a
  Client Component that does the actual rendering + `useTranslation()`,
  since the hook needs client context. What's still intentionally in
  English only, because it was never translated in the original `lang.js`
  dictionary either (nothing to port): the homepage hero's long-form intro
  paragraphs, individual tour-package day-by-day itinerary text
  (`lib/tour-packages.ts` — long-form content, not short UI strings), and a
  handful of one-off marketing lines ("Elite Trackers", "Max Sightings",
  etc.) that have no corresponding translation key.
- **Booking page now uses the ported page-specific CSS** and the **Details
  modal is ported** (update: both done in follow-up passes) —
  `app/booking/booking.css` carries over the original `booking.html`'s full
  inline `<style>` block, including the `.details-modal*`/`.modal-*`/
  `.cancel-*` classes for the bottom-sheet. `components/DetailsModal.tsx` is
  a new component (opened via the "📋 Details" button in the fixed bottom
  bar, matching the original's placement) showing both parks' jeep pricing,
  the cancellation policy tiers, and — once a park is selected — that
  park's specific rules (reusing the existing `getParkRules()` from
  `lib/booking-data.ts`). Purely informational, same as the original; it
  doesn't affect booking state or pricing math. `app/booking/page.tsx` uses
  real class names throughout instead of ad hoc inline `style={{...}}`
  props, so visual layout now matches the original closely.
  that was previously reachable via a modal. The 4-step flow, pricing logic,
  Tuesday-closure check, and Razorpay integration are all fully functional.
- **Gallery section** on the homepage (the "click to view" Unsplash
  placeholder grid) was intentionally left out of `app/page.tsx` — it was a
  non-functional placeholder in the original (`onclick="alert(...)"`) with
  no real backing data, so there was nothing meaningful to port beyond
  static Unsplash stock images.
- **`car_rental_bookings.status`** admin confirm/reject flow exists via
  `app/api/admin/car-rentals/[id]/route.ts`, but there's no vehicle/driver
  assignment UI beyond marking status — matching the original's scope
  (it also had no such UI).

## 5. Reference files disposition

`reference-index.html`, `reference-pages/`, `reference-js/`,
`reference-style.css`, `reference-db-schema.sql`,
`reference-netlify-functions/`, and `reference-images/` are **left in
place** at the project root (not deleted). They were the source material
for this rewrite and are useful to keep around for any remaining i18n
wiring or pixel-parity polish. They are not imported or referenced by any
runtime code — safe to delete once you're confident nothing else needs
cross-checking against them. `public/images/` already has the images this
app actually uses, copied out of `reference-images/`.

## 6. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Your Supabase project URL. Safe to expose. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase anon/public key. Safe to expose — RLS is what actually protects data. |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Full-access key. **Never** expose this. Only read in `lib/supabase-server.ts`. |
| `ADMIN_PASSWORD_HASH` | server only | bcrypt hash of your admin password. Generate with `node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"`. |
| `NEXTAUTH_SECRET` | server only | Random secret for signing session JWTs. Generate with `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | server only | `http://localhost:3000` locally; your production URL when deployed. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | server only | From your Razorpay dashboard (use **test mode** keys first). |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | client | Same value as `RAZORPAY_KEY_ID` — Razorpay's public key id is safe to expose (it identifies the merchant account, not a secret). |
| `RAZORPAY_WEBHOOK_SECRET` | server only, optional until you set up the webhook | A *different* secret from `RAZORPAY_KEY_SECRET` — generated when you add a webhook endpoint in the Razorpay Dashboard (Settings → Webhooks). Not required for the app to build/run; `app/api/razorpay/webhook` fails closed (401) if it's missing. |
| `BLOB_READ_WRITE_TOKEN` | server only, optional | Only needed if you swap file uploads from Supabase Storage to Vercel Blob. Not required for the default setup. |

## 7. Setup steps

1. **Create the Supabase Storage bucket.** Running
   `supabase/migrations/0001_rls_and_razorpay.sql` (step 2 below) already
   creates a **private** bucket named `assam-uploads` via SQL
   (`insert into storage.buckets ...`). No manual dashboard step is
   required, but you can verify it in Supabase Studio → Storage → it
   should show `assam-uploads` with "Public" turned **off**.

2. **Run the new SQL migration.** In the Supabase SQL Editor (or via the
   Supabase CLI), run `reference-db-schema.sql` first if you haven't
   already (creates `bookings`, `reviews`, `drop_route_prices`), then run
   `supabase/migrations/0001_rls_and_razorpay.sql` (adds `vehicles`,
   `trending_itineraries`, `car_rental_bookings`, Razorpay columns, and
   locks down RLS policies for the `anon` role). The migration is
   idempotent (`IF NOT EXISTS` / `DROP POLICY IF EXISTS` throughout) — safe
   to re-run.

3. **Obtain/rotate the Supabase service-role key.** In your Supabase
   project dashboard → Settings → API → `service_role` secret. **If this
   project reuses the same Supabase project as the old static site**, treat
   that key as already compromised (it was shipped in public HTML for an
   unknown period) — rotate it in the dashboard before going live, then put
   the new value in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`. Never put
   it anywhere else.

4. **Set up Razorpay test-mode keys.** Sign in to the Razorpay dashboard →
   Settings → API Keys → generate a **Test Mode** key pair. Put the key id
   in both `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID`, and the
   secret in `RAZORPAY_KEY_SECRET` only. Test payments with Razorpay's
   published test card/UPI numbers before switching to live keys.

5. **Add the Razorpay webhook (after you have a real deployed URL).**
   Razorpay Dashboard → Settings → Webhooks → Add New Webhook → URL:
   `https://<your-domain>/api/razorpay/webhook`, event: `payment.captured`.
   Copy the webhook secret it generates (different from `RAZORPAY_KEY_SECRET`)
   into `RAZORPAY_WEBHOOK_SECRET`. This is a safety net for payments that
   succeed on Razorpay's side but never reach `/api/razorpay/verify` (closed
   tab, dropped connection) — optional for local testing, recommended before
   accepting real payments.

6. **Run locally.**
   ```bash
   npm install        # if you haven't already
   npm run dev
   ```
   Visit `http://localhost:3000`. Admin panel is at `/admin/login` (use the
   plaintext password whose bcrypt hash you put in `ADMIN_PASSWORD_HASH`).

7. **Deploy.** This is a standard Next.js App Router app (Route Handlers,
   middleware/`proxy.ts`, NextAuth) — deploys cleanly to **Vercel** (zero
   config) or **Netlify** (via its Next.js Runtime, which supports API
   routes and middleware). Either way: push to the Git repo, connect it to
   the host, set every environment variable above in that host's project
   settings (Production + any Preview/branch deploys), and set
   `NEXTAUTH_URL` to the real deployed URL — NextAuth's cookie signing
   depends on this matching exactly. `next build` (verified working — see
   below) runs automatically on deploy. Switch Razorpay keys to live mode,
   and add the webhook (step 5) pointing at the real domain, only once
   you've fully tested the flow in test mode.

## 8. Build status

`npm run build` succeeds cleanly (Next.js 16.3.5, Turbopack): all pages
compile, TypeScript passes with no errors, and every route is generated —
29 routes total (28 + the Razorpay webhook added in a follow-up pass),
including all 6 admin CRUD sections and all public pages. `npm run lint`
also passes with 0 errors (only pre-existing warnings: a few
`react-hooks/exhaustive-deps` notices on intentional fetch-on-mount effects
in the admin pages, and `@next/next/no-img-element` suggestions to use
`next/image` instead of `<img>` for a handful of logo/hero images — neither
blocks the build or indicates a bug). The Supabase read warnings printed
during the build (`getTrendingItineraries threw: Error: supabaseUrl is
required...`) are expected and harmless in an environment with no
`.env.local` — every server-side read function in `lib/supabase/reads.ts`
catches its own errors and falls back to an empty array, so pages still
render (just without dynamic data) instead of failing the build. Once real
Supabase credentials are set, these reads succeed normally.
