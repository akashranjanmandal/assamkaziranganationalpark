const { hmacMatches, verifyWithRazorpay, confirmOrder, findOrder, json, parseBody, InputError, PaymentError } = require('../lib/safari');
const { rateLimit } = require('../lib/guard');

// Called by the browser after Razorpay Checkout succeeds (safari or car rental).
// Three independent checks before anything is confirmed:
//   1. Razorpay's signature over "order|payment" (needs our secret key),
//   2. Razorpay's own record: the payment is captured, for this order, in INR,
//   3. the amount equals what our database priced for the order.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
  if (!(await rateLimit(event, 'verify', 30, 600))) return json(429, { error: 'Too many attempts. Please wait a few minutes.' });

  let p;
  try {
    p = parseBody(event);
  } catch (err) {
    if (err instanceof InputError) return json(400, { error: err.message });
    throw err;
  }

  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = p;
  if (typeof orderId !== 'string' || typeof paymentId !== 'string' || !/^[\w-]{1,64}$/.test(orderId) || !/^[\w-]{1,64}$/.test(paymentId)
      || !hmacMatches(`${orderId}|${paymentId}`, process.env.RAZORPAY_KEY_SECRET, signature)) {
    return json(400, { error: 'Payment verification failed' });
  }

  try {
    await verifyWithRazorpay(orderId, paymentId);
  } catch (err) {
    if (err instanceof PaymentError) {
      console.error(`verify-payment REJECTED order ${orderId} payment ${paymentId}: ${err.message}`);
      return json(400, { error: 'Payment verification failed. If money was deducted, please contact us with payment ID ' + paymentId });
    }
    console.error('verify-payment could not reach Razorpay:', err);
    return json(502, { error: 'We could not confirm your payment yet. Do not pay again — your booking will be confirmed automatically, or contact us with payment ID ' + paymentId });
  }

  try {
    await confirmOrder(orderId, paymentId);
    // The webhook may have confirmed it first, so read it back rather than relying on the update result.
    const found = await findOrder(orderId);
    if (!found) throw new Error('No booking for order ' + orderId);
    return json(200, found);
  } catch (err) {
    console.error('verify-payment failed:', err);
    return json(500, { error: 'Payment received but we could not update your booking. Please contact us with payment ID ' + paymentId });
  }
};
