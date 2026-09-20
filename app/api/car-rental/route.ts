import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { carRentalSchema } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * Public car rental enquiry submission. Server-side insert, replacing the
 * old client-side `sb.from('car_rental_bookings').insert(...)` call that
 * used the hardcoded service_role key.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = carRentalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid enquiry data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const sb = supabaseAdmin();
  const { data: rental, error } = await sb
    .from("car_rental_bookings")
    .insert({
      vehicle_id: d.vehicle_id ?? null,
      vehicle_name: d.vehicle_name ?? null,
      itinerary: d.itinerary,
      num_passengers: d.num_passengers,
      num_days: d.num_days ?? null,
      pickup_date: d.pickup_date || null,
      pickup_location: d.pickup_location ?? null,
      total_cost: d.total_cost ?? null,
      customer_name: d.customer_name ?? null,
      customer_phone: d.customer_phone ?? null,
      customer_email: d.customer_email || null,
      upi_ref: d.upi_ref ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rental }, { status: 201 });
}
