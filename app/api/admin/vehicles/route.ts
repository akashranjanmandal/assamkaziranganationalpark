import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { vehicleSchema } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase-server";

/** Admin-only: list all vehicles. */
export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("vehicles").select("*").order("capacity");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vehicles: data ?? [] });
}

/** Admin-only: create a vehicle. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = vehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid vehicle", details: parsed.error.flatten() }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("vehicles")
    .insert({ ...parsed.data, active: parsed.data.active ?? true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vehicle: data }, { status: 201 });
}
