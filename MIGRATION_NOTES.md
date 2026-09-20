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
  admin manually verifies" flow is replaced by a real Razorpay Checkout.js
  integration:
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
  - The manual QR/screenshot path is kept available in the schema
    (`payment_method: 'qr' | 'razorpay'`, `screenshot_path` column) for
    admins who still want to manually confirm a booking, but the primary
    booking page flow now defaults to Razorpay.
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

- **Navbar and Footer are now wired through `useTranslation()`** (update:
  done in a follow-up pass) — `components/Navbar.tsx` and
  `components/Footer.tsx` render `t("nav_home")`, `t("footer_col1")`, etc.
  instead of fixed English strings, using the existing key set in
  `lib/i18n/translations.ts` (already had full 12-language coverage for
  every nav/footer key — no new translation content was needed). The
  tagline ("The elite vanguard...") and "Recognised by..." strip text still
  render in English only, because those strings were never translated in
  the original `lang.js` dictionary either — nothing to port. Remaining
  page bodies (homepage sections, itineraries, reviews, car-rental, booking)
  still render fixed English copy; wiring those is mechanical, same pattern.
- **Booking page now uses the ported page-specific CSS** (update: done in a
  follow-up pass) — `app/booking/booking.css` carries over the original
  `booking.html`'s ~1000-line inline `<style>` block verbatim (step bar,
  park-option cards, time-slot pills, guest-count steppers, guest cards,
  Aadhaar upload area, payment card, fixed bottom action bar), and
  `app/booking/page.tsx` was rewritten to use those real class names instead
  of ad hoc inline `style={{...}}` props. Visual layout now matches the
  original far more closely. Still not ported: the "Details" bottom-sheet
  modal (jeep options / pricing table / cancellation policy / park rules,
  opened via a "See Details" button in the original) and its associated CSS
  (`.details-modal*`, `.modal-*`, `.cancel-*` classes are in
  reference-pages/booking.html but not yet used in the Next.js page) — the
  booking flow itself doesn't need it to function, it's supplementary info
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

5. **Run locally.**
   ```bash
   npm install        # if you haven't already
   npm run dev
   ```
   Visit `http://localhost:3000`. Admin panel is at `/admin/login` (use the
   plaintext password whose bcrypt hash you put in `ADMIN_PASSWORD_HASH`).

6. **Deploy (Vercel recommended).** Push to a Git repo, import into Vercel,
   set all the environment variables above in the Vercel project settings
   (Production + Preview), and set `NEXTAUTH_URL` to your real deployed URL.
   `next build` (verified working — see below) runs automatically on
   deploy. Switch Razorpay keys to live mode only once you've fully tested
   the flow in test mode.

## 8. Build status

`npm run build` succeeds cleanly (Next.js 16.3.5, Turbopack): all pages
compile, TypeScript passes with no errors, and every route is generated —
28 routes total, including all 6 admin CRUD sections and all public pages.
The Supabase read warnings printed during the build (`getTrendingItineraries
threw: Error: supabaseUrl is required...`) are expected and harmless in an
environment with no `.env.local` — every server-side read function in
`lib/supabase/reads.ts` catches its own errors and falls back to an empty
array, so pages still render (just without dynamic data) instead of failing
the build. Once real Supabase credentials are set, these reads succeed
normally.
