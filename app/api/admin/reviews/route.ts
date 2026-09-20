import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

/** Admin-only: list all reviews (approved and pending). */
export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("reviews").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}
