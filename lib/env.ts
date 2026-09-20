/**
 * Centralized, typed environment configuration.
 *
 * Every secret/config value in this app is read from here — nowhere else in
 * the codebase should call `process.env.X` directly. This keeps secrets
 * auditable in one place and fails fast (at import time) if something
 * required is missing, instead of failing confusingly deep in a request.
 *
 * Server-only values are never imported into a Client Component. Anything
 * prefixed NEXT_PUBLIC_ is safe to reach the browser bundle; nothing else is.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.local.example to .env.local and fill it in.`
    );
  }
  return value;
}

// ---- Public (safe for the browser bundle) ----
// IMPORTANT: read eagerly but do NOT throw here — `next build` runs in an
// environment that may not have real secrets set, and this module is
// imported (directly or transitively) by code that runs during the build's
// static analysis/page generation. Throwing here would break `next build`.
// Consumers that truly require a value at runtime should check/throw
// themselves (e.g. when actually constructing a Supabase client with an
// empty URL, the request will fail loudly, which is an acceptable runtime
// failure mode — but the build itself must always succeed).
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '',
};

// ---- Server-only (NEVER import this module's `serverEnv` from a Client Component) ----
function readServerEnv() {
  return {
    supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
    adminPasswordHash: required('ADMIN_PASSWORD_HASH', process.env.ADMIN_PASSWORD_HASH),
    nextAuthSecret: required('NEXTAUTH_SECRET', process.env.NEXTAUTH_SECRET),
    razorpayKeyId: required('RAZORPAY_KEY_ID', process.env.RAZORPAY_KEY_ID),
    razorpayKeySecret: required('RAZORPAY_KEY_SECRET', process.env.RAZORPAY_KEY_SECRET),
    // Optional at build time: this is a *different* secret from RAZORPAY_KEY_SECRET,
    // generated when you add a webhook endpoint in the Razorpay dashboard
    // (Settings -> Webhooks). Not required until you wire up the webhook
    // there, so it's not eagerly `required()` — app/api/razorpay/webhook
    // checks for it itself and fails closed (401) if it's missing.
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
    // Optional: only needed if using Vercel Blob instead of Supabase Storage for uploads.
    blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN ?? '',
  };
}

// Lazily evaluated so importing this file at the top of a shared module
// doesn't crash client bundles that merely re-export types from here.
let _serverEnv: ReturnType<typeof readServerEnv> | null = null;
export function getServerEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() was called from client-side code. This must only run on the server.');
  }
  if (!_serverEnv) _serverEnv = readServerEnv();
  return _serverEnv;
}
