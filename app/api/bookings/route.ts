import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { bookingSchema } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * Public booking submission. The browser never talks to Supabase directly
 * for this write (the old static site's booking.html did `sb.from('bookings').insert(...)`
 * straight from the client using a hardcoded service_role key). Here the
 * request is validated, then inserted server-side with the service-role
 * client — the anon key's RLS policy for `bookings` only allows INSERT
 * anyway, as a defence-in-depth backstop, but this route is the primary path.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid booking data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Primary guest must carry an Aadhaar upload key and contact — enforced
  // here too, not just in the client UI, since this route is the real gate.
  const primary = data.guests[0];
  if (!primary?.aadhaar_path) {
    return NextResponse.json(
      { error: "Primary guest must include an aadhaar_path (upload the Aadhaar first via /api/upload)." },
      { status: 400 }
    );
  }
  if (!primary?.contact) {
    return NextResponse.json({ error: "Primary guest must include a contact number." }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: booking, error } = await sb
    .from("bookings")
    .insert({
      safari_destination: data.safari_destination,
      safari_date: data.safari_date,
      time_slot: data.time_slot,
      price_per_person: data.price_per_person,
      num_guests: data.num_guests,
      num_adults: data.num_adults,
      num_children: data.num_children,
      chargeable_guests: data.chargeable_guests,
      total_price: data.total_price,
      primary_contact: data.primary_contact,
      guests: data.guests,
      payment_status: "awaiting_payment",
      payment_method: "razorpay",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ booking }, { status: 201 });
}
