import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { reviewSchema } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * Public review submission. Always inserts with approved: false — a review
 * only becomes publicly visible once an admin approves it via
 * /api/admin/reviews/[id]. This matches the original site's moderation model,
 * just enforced server-side (the client can no longer set `approved: true`
 * itself, since that field is never read from the request body).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid review data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();
  const { data: review, error } = await sb
    .from("reviews")
    .insert({
      name: parsed.data.name,
      rating: parsed.data.rating,
      message: parsed.data.message,
      park: parsed.data.park ?? null,
      approved: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ review }, { status: 201 });
}
