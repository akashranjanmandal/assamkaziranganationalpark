// Tells the guest their booking is confirmed on WhatsApp — only if the WhatsApp Cloud API is set up
// (see whatsapp.js). A failure is logged and reported, never thrown, so it can't undo a payment.
const { sendSafariConfirmation } = require('./whatsapp');

const SAFARI_SELECT = '*, park:parks(name), customer:customers(name, phone)';

// Safari booking paid. Returns { whatsapp } as a status string.
async function notifySafari(db, id) {
  try {
    const { data: b, error } = await db.from('safari_bookings').select(SAFARI_SELECT).eq('id', id).single();
    if (error) { console.error('notifySafari load failed:', error.message); return { whatsapp: 'failed' }; }
    await sendSafariConfirmation(b);
    return { whatsapp: 'sent' };
  } catch (err) {
    console.error(`WhatsApp for safari ${id} failed:`, err.message || err);
    return { whatsapp: 'failed: ' + (err.message || 'error') };
  }
}

module.exports = { notifySafari };
