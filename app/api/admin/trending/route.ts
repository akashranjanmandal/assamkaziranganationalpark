import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { trendingItinerarySchema } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase-server";

function buildDetailsHtml(days: { title: string; activities: string[] }[], note?: string): string | null {
  if (!days.length && !note) return null;
  let html = '<div class="td-days">';
  days.forEach((d, i) => {
    const items = d.activities.map((a) => `<li>${a}</li>`).join("");
    html += `<div class="td-day"><div class="td-day-num">Day ${i + 1}</div><div class="td-day-title">${
      d.title || `Day ${i + 1}`
    }</div>${items ? `<ul>${items}</ul>` : ""}</div>`;
  });
  html += "</div>";
  if (note) html += `<div class="td-note">${note}</div>`;
  return html;
}

/** Admin-only: list all trending itineraries. */
export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("trending_itineraries").select("*").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ itineraries: data ?? [] });
}

/** Admin-only: create a trending itinerary, building days_json + details HTML server-side. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = trendingItinerarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid itinerary", details: parsed.error.flatten() }, { status: 400 });
  }

  const { days = [], note, ...rest } = parsed.data;
  const sb = supabaseAdmin();

  const { data: existing } = await sb.from("trending_itineraries").select("sort_order");
  const maxOrder = existing?.length ? Math.max(...existing.map((r) => r.sort_order ?? 0)) + 1 : 1;

  const { data, error } = await sb
    .from("trending_itineraries")
    .insert({
      title: rest.title,
      duration: rest.duration,
      price_from: rest.price_from ?? null,
      short_desc: rest.short_desc ?? null,
      days_json: JSON.stringify(days),
      details: buildDetailsHtml(days, note),
      active: rest.active ?? true,
      sort_order: maxOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ itinerary: data }, { status: 201 });
}
