// WhatsApp confirmations via Meta's WhatsApp Cloud API.
// Business-initiated messages must use templates approved in WhatsApp Manager;
// each template's body placeholders {{1}}..{{n}} are filled in the order of
// `params` below. Does nothing unless WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID are set.
const GRAPH_VERSION = 'v23.0';

// Guests type free text ("+91 98765 43210", "098765 43210", ...). WhatsApp wants
// digits only with country code, e.g. 919876543210. Assumes India when no code given.
function toWhatsAppNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1);
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

function formatDate(isoDate) {
  return new Date(isoDate + 'T00:00:00Z').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
  });
}

const rupees = n => Number(n || 0).toLocaleString('en-IN');

async function sendTemplate(rawPhone, template, params, what) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return;

  const to = toWhatsAppNumber(rawPhone);
  if (!to) {
    console.error(`WhatsApp: ${what} has unusable contact "${rawPhone}"`);
    return;
  }

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: template,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
        components: [{
          type: 'body',
          parameters: params.map(t => ({ type: 'text', text: String(t) }))
        }]
      }
    })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data.error && data.error.message) || `WhatsApp API returned ${res.status}`);
  }
}

// Template "booking_confirmation": {{1}} name, {{2}} booking ID, {{3}} destination,
// {{4}} date, {{5}} time, {{6}} guests, {{7}} amount paid.
function sendSafariConfirmation(b) {
  const guests = b.num_children
    ? `${b.num_adults} adult(s), ${b.num_children} child(ren)`
    : `${b.num_adults} adult(s)`;
  return sendTemplate(b.customer.phone, process.env.WHATSAPP_TEMPLATE || 'booking_confirmation', [
    b.customer.name,
    'S-' + b.id,
    `${b.park.name} – ${b.zone_name}`,
    formatDate(b.safari_date),
    b.slot_label,
    guests,
    rupees(b.total_amount)
  ], `safari booking ${b.id}`);
}

module.exports = { sendSafariConfirmation, toWhatsAppNumber };
