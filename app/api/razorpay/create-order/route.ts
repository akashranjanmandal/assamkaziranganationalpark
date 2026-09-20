import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Razorpay from "razorpay";
import { razorpayCreateOrderSchema } from "@/lib/schemas";
import { getServerEnv } from "@/lib/env";

/**
 * Creates a Razorpay order server-side. The amount (in paise) and an
 * optional receipt id are supplied by the client, but the actual charge is
 * always verified against Razorpay's own signature in /api/razorpay/verify
 * before anything is marked paid — this endpoint alone cannot mark a
 * booking as paid.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = razorpayCreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid order request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const { razorpayKeyId, razorpayKeySecret } = getServerEnv();
    const instance = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const order = await instance.orders.create({
      amount: parsed.data.amountPaise,
      currency: "INR",
      receipt: parsed.data.receipt ?? `aws_${Date.now()}`,
    });

    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Razorpay order creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
