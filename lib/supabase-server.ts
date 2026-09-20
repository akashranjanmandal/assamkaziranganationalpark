import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv, getServerEnv } from './env';

/**
 * Server-only Supabase client using the service_role key.
 * Bypasses Row Level Security by design — that's fine here because this
 * module is guarded by `server-only` and only ever imported from Route
 * Handlers / Server Components / Server Actions. It must NEVER be imported
 * from a file that ships to the browser.
 */
export function supabaseAdmin() {
  const { supabaseServiceRoleKey } = getServerEnv();
  return createClient(publicEnv.supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
