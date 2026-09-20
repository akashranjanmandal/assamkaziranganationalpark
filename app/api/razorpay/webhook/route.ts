import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { getServerEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * Razorpay webhook — a second, independent confirmation path for payments,
 * alongside app/api/razorpay/verify (which the browser calls right after
 * Checkout.js completes). The webhook exists to cover the case where a
 * payment succeeds on Razorpay's side but the browser never gets to call
 * /verify (tab closed, network drop, crash, etc.) — without this, that
 * booking would stay "awaiting_payment" forever even though the guest paid.
 *
 * Configure this URL in the Razorpay Dashboard -> Settings -> Webhooks:
 *   https://<your-domain>/api/razorpay/webhook
 * Subscribe to the "payment.captured" event. The webhook secret shown there
 * is DIFFERENT from RAZORPAY_KEY_SECRET — put it in RAZORPAY_WEBHOOK_SECRET.
 *
 * Security: Razorpay signs the raw request body with the webhook secret
 * (HMAC-SHA256, header `x-razorpay-signature`). We verify that signature
 * before trusting anything in the payload — this is the only thing that
 * distinguishes a real Razorpay request from anyone POSTing fake JSON here.
 */
export async function POST(request: NextRequest) {
  const { razorpayWebhookSecret } = getServerEnv();

  if (!razorpayWebhookSecret) {
    // Webhook not configured yet — fail closed rather than silently no-op,
    // so misconfiguration is visible in Razorpay's dashboard delivery logs
    // instead of looking like a quiet success.
    return NextResponse.json({ error: "Webhook not configured" }, { status: 401 });
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Must verify against the exact raw bytes Razorpay signed — parsing JSON
  // first and re-serializing it could produce a different byte string and
  // make a legitimate request fail verification.
  const rawBody = await request.text();

  const expected = crypto.createHmac("sha256", razorpayWebhookSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(signature, "utf8");
  const validSignature =
    expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf);

  if (!validSignature) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let payload: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          status?: string;
          notes?: Record<string, string>;
        };
      };
    };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Only act on a captured (successfully charged) payment. Other events
  // (order.paid, payment.failed, etc.) are acknowledged but ignored — we
  // only need this one event to close the "browser never called /verify" gap.
  if (payload.event !== "payment.captured") {
    return NextResponse.json({ received: true, ignored: payload.event ?? "unknown" });
  }

  const payment = payload.payload?.payment?.entity;
  const orderId = payment?.order_id;
  const paymentId = payment?.id;
  if (!orderId || !paymentId) {
    return NextResponse.json({ error: "Malformed webhook payload" }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // Idempotent by design: this only flips awaiting_payment -> paid. If
  // /verify already marked it paid (the common path), or an admin already
  // confirmed it, this update matches zero rows and does nothing — safe to
  // receive the same webhook event more than once, which Razorpay does on
  // retries.
  const { data, error } = await sb
    .from("bookings")
    .update({
      payment_status: "paid",
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      payment_id: paymentId,
      payment_method: "razorpay",
    })
    .eq("razorpay_order_id", orderId)
    .eq("payment_status", "awaiting_payment")
    .select("id");

  if (error) {
    // Signature was valid but the DB write failed — return 500 so Razorpay
    // retries delivery instead of marking this event as handled.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true, updated: data?.length ?? 0 });
}
