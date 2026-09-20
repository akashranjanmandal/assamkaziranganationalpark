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

/** Admin-only: update a trending itinerary (or just toggle active). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = trendingItinerarySchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update", details: parsed.error.flatten() }, { status: 400 });
  }

  const { days, note, ...rest } = parsed.data;
  const update: Record<string, unknown> = { ...rest };
  if (days !== undefined) {
    update.days_json = JSON.stringify(days);
    update.details = buildDetailsHtml(days, note);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb.from("trending_itineraries").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ itinerary: data });
}

/** Admin-only: delete a trending itinerary. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = supabaseAdmin();
  const { error } = await sb.from("trending_itineraries").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
