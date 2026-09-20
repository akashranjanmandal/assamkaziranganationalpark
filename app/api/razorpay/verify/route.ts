import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { razorpayVerifySchema } from "@/lib/schemas";
import { getServerEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * Verifies a Razorpay Checkout.js payment server-side using HMAC-SHA256,
 * exactly as Razorpay's docs specify:
 *   expected = hmac_sha256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)
 *   valid    = expected === razorpay_signature
 *
 * Only on a valid signature does this route update the booking's
 * payment_status to "paid" and store the order/payment/signature ids. The
 * client-side "payment succeeded" callback from Checkout.js is never trusted
 * on its own — this is the only place a booking is marked paid via Razorpay.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = razorpayVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid verification payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = parsed.data;

  const { razorpayKeySecret } = getServerEnv();
  const expectedSignature = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expectedSignature, "utf8");
  const providedBuf = Buffer.from(razorpay_signature, "utf8");
  const isValid =
    expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf);

  if (!isValid) {
    return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: booking, error } = await sb
    .from("bookings")
    .update({
      payment_status: "paid",
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_method: "razorpay",
      payment_id: razorpay_payment_id,
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ verified: true, booking });
}
