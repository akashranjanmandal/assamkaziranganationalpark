const { hmacMatches, confirmOrder, verifyWebhookPayment, knownOrder, confirmByPaymentLink, json, PaymentError } = require('../lib/safari');

// Razorpay → server backup, so a booking is still confirmed if the guest
// closes the tab before verify-payment runs.
// Dashboard: Settings → Webhooks → https://<site>/.netlify/functions/razorpay-webhook
// Events: payment.captured, order.paid, payment_link.paid  (tick all three)
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error('razorpay-webhook: RAZORPAY_WEBHOOK_SECRET is not set');
    return json(500, { error: 'Webhook not configured' });
  }

  // The signature is over the exact raw body, so check it before parsing.
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  const signature = event.headers['x-razorpay-signature'];
  if (!hmacMatches(raw, process.env.RAZORPAY_WEBHOOK_SECRET, signature)) {
    return json(400, { error: 'Invalid signature' });
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const payment = body.payload && body.payload.payment && body.payload.payment.entity;

  // A guest paid the payment link the admin sent from the booking.
  if (body.event === 'payment_link.paid') {
    const link = body.payload && body.payload.payment_link && body.payload.payment_link.entity;
    if (link && link.id && payment) {
      try {
        const matched = await confirmByPaymentLink(link.id, payment);
        if (!matched) console.error(`razorpay-webhook: payment link ${link.id} does not belong to any booking`);
      } catch (err) {
        if (err instanceof PaymentError) {
          console.error(`razorpay-webhook REJECTED payment link ${link.id} payment ${payment.id}: ${err.message}`);
          return json(200, { ok: true, ignored: true });
        }
        console.error('webhook payment-link confirm failed:', err);
        return json(500, { error: 'DB update failed' });
      }
    }
    return json(200, { ok: true });
  }

  if (body.event === 'payment.captured' || body.event === 'order.paid') {
    if (payment && payment.order_id) {
      try {
        // Payments made through a payment link also raise payment.captured, but for an order that is not a
        // website checkout. They are handled by payment_link.paid above, so skip them here.
        if (!(await knownOrder(payment.order_id))) return json(200, { ok: true, ignored: true });
        await verifyWebhookPayment(payment);
        await confirmOrder(payment.order_id, payment.id);
      } catch (err) {
        if (err instanceof PaymentError) {
          // A signed event that does not match our order is not worth retrying; flag it for a human.
          console.error(`razorpay-webhook REJECTED order ${payment.order_id} payment ${payment.id}: ${err.message}`);
          return json(200, { ok: true, ignored: true });
        }
        console.error('webhook confirm failed:', err);
        return json(500, { error: 'DB update failed' }); // non-2xx makes Razorpay retry
      }
    }
  }

  return json(200, { ok: true });
};
