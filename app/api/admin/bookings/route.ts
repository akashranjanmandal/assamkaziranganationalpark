import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * Admin-only: list all bookings. Protected by proxy.ts (requires a valid
 * NextAuth session) — no additional check needed here, but the service-role
 * client is still only ever used inside this server-side route.
 */
export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("bookings").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data ?? [] });
}
