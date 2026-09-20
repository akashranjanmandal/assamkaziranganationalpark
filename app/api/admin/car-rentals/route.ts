import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

/** Admin-only: list all car rental enquiries. */
export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("car_rental_bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rentals: data ?? [] });
}
