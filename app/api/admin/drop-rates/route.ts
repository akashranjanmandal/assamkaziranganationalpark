import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { dropRateSchema } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase-server";

/** Admin-only: list all drop route prices. */
export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("drop_route_prices").select("*").order("route_name").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rates: data ?? [] });
}

/** Admin-only: add a drop rate row for a route/vehicle. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = dropRateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid rate", details: parsed.error.flatten() }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from("drop_route_prices")
    .select("sort_order")
    .eq("route_name", parsed.data.route_name);
  const maxOrder = existing?.length ? Math.max(...existing.map((r) => r.sort_order ?? 0)) + 1 : 1;

  const { data, error } = await sb
    .from("drop_route_prices")
    .insert({ ...parsed.data, active: parsed.data.active ?? true, sort_order: maxOrder })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rate: data }, { status: 201 });
}
