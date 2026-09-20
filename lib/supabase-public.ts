import { createClient } from '@supabase/supabase-js';
import { publicEnv } from './env';

/**
 * Anon-key Supabase client. Safe to use in Server Components for public
 * reads (respects RLS) and safe to import into Client Components too, since
 * it only ever holds the public anon key — never the service_role key.
 */
export function supabasePublic() {
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
