/* Itineraries: renders the itinerary cards from the database (home page + Itineraries page) and runs the
   itinerary booking form. Nothing is paid online: the guest sends their details and we contact them.
   Two kinds of request:
     - one of our itineraries (days / nights are fixed by the itinerary; a description is optional)
     - a customised itinerary (description, days and nights, optional pickup/drop)               */
(function () {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const toast = (m, t) => (typeof showToast === 'function' ? showToast(m, t) : alert(m));
  const duration = it => `${it.num_nights} Night${it.num_nights === 1 ? '' : 's'} / ${it.num_days} Day${it.num_days === 1 ? '' : 's'}`;

  /* ───────── data ───────── */
  let cache = null;
  async function load() {
    if (cache) return cache;
    try {
      const res = await fetch('/.netlify/functions/public-data?type=itineraries');
      cache = res.ok ? (await res.json()).data || [] : [];
    } catch { cache = []; }
    return cache;
  }

  /* ───────── cards ───────── */
  const SHOWN_DAYS = 2;

  function cardHtml(it) {
    const days = Array.isArray(it.days) ? it.days : [];
    const sections = Array.isArray(it.sections) ? it.sections : [];
    const dayHtml = (d, i) => `<div class="day-item${i >= SHOWN_DAYS ? ' it-more' : ''}"${i >= SHOWN_DAYS ? ' hidden' : ''}>
        <div class="day-num">Day ${i + 1}</div>
        <div class="day-desc"><strong>${esc(d.title)}</strong>${d.text ? ' — ' + esc(d.text) : ''}</div></div>`;
    const secHtml = s => `<div class="it-sec it-more" hidden><div class="it-sec-h">${esc(s.heading)}</div><ul>${(s.items || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    const more = days.length > SHOWN_DAYS || sections.length || it.notes;
    return `<div class="tour-card" data-itinerary="${esc(it.id)}">
      <div class="tour-card-header">
        ${it.badge ? `<div class="tour-card-badge">${esc(it.badge)}</div>` : ''}
        <h3 class="tour-card-title">${esc(it.title)}</h3>
        <div class="tour-card-duration">${esc(duration(it))}</div>
        ${it.route ? `<div class="tour-card-route">${esc(it.route)}</div>` : ''}
      </div>
      <div class="tour-card-body">
        <div class="day-list">${days.map(dayHtml).join('')}</div>
        ${sections.map(secHtml).join('')}
        ${it.notes ? `<div class="it-note it-more" hidden>${esc(it.notes)}</div>` : ''}
        ${more ? '<button type="button" class="it-toggle" data-act="toggle">View full itinerary ▼</button>' : ''}
      </div>
      <div class="tour-card-footer">
        <button type="button" class="tour-enquire-btn" data-act="book" data-id="${esc(it.id)}">Book Now</button>
      </div>
    </div>`;
  }

  async function renderInto(el) {
    if (!el) return;
    injectStyle();
    const list = await load();
    el.innerHTML = list.length ? list.map(cardHtml).join('') : '<p style="grid-column:1/-1;text-align:center;color:var(--forest-mid);">Itineraries are being updated. Please check back soon.</p>';
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const card = b.closest('.tour-card');
      if (b.dataset.act === 'book') openBooking({ kind: 'preset', id: b.dataset.id });
      if (b.dataset.act === 'toggle') {
        const open = card.classList.toggle('it-open');
        card.querySelectorAll('.it-more').forEach(x => { x.hidden = !open; });
        b.textContent = open ? 'Hide itinerary ▲' : 'View full itinerary ▼';
      }
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  /* ───────── styles ───────── */
  function injectStyle() {
    if ($('it-style')) return;
    const s = document.createElement('style'); s.id = 'it-style';
    s.textContent = `
      .it-toggle{display:block;width:100%;margin-top:1rem;padding:.6rem;background:none;border:1px solid rgba(0,0,0,.15);color:var(--forest-dark,#1a3a1e);font-size:.68rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;font-family:inherit;}
      .it-toggle:hover{border-color:var(--gold,#b5943b);color:var(--gold,#b5943b);}
      .it-sec{margin-top:1.1rem;}.it-sec-h{font-size:.62rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--gold,#b5943b);margin-bottom:.4rem;}
      .it-sec ul{margin:0;padding-left:1.1rem;font-size:.82rem;line-height:1.7;color:var(--forest-mid,#3a6b3e);}
      .it-note{margin-top:1.1rem;font-size:.8rem;line-height:1.6;background:#fdf8ec;border:1px solid #e8d89a;padding:.7rem .9rem;color:#5a4a1a;}
      .it-custom{max-width:1300px;margin:3rem auto 0;padding:0 2rem;}
      .it-custom-box{background:var(--forest-black,#050d06);color:#fff;padding:2rem;display:flex;gap:1.5rem;align-items:center;justify-content:space-between;flex-wrap:wrap;border-left:4px solid var(--gold,#b5943b);}
      .it-custom-box h3{font-family:var(--font-display,Georgia,serif);font-size:1.8rem;font-weight:400;margin-bottom:.3rem;}
      .it-custom-box p{color:rgba(255,255,255,.65);max-width:640px;font-size:.95rem;line-height:1.6;}
      .it-custom-box button{background:var(--gold,#b5943b);color:#050d06;border:none;padding:1rem 2rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;font-size:.8rem;cursor:pointer;font-family:inherit;}
      #it-modal{position:fixed;inset:0;z-index:10000;display:none;align-items:flex-start;justify-content:center;background:rgba(5,13,6,.7);overflow-y:auto;padding:2rem 1rem;}
      #it-modal.open{display:flex;}
      .itb{background:#fff;color:#1a2e1c;width:100%;max-width:680px;border-radius:10px;overflow:hidden;font-family:var(--font-body,system-ui,sans-serif);}
      .itb-head{background:var(--forest-black,#050d06);color:#fff;padding:1.1rem 1.4rem;display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;border-bottom:3px solid var(--gold,#b5943b);}
      .itb-head h2{font-family:var(--font-display,Georgia,serif);font-size:1.5rem;font-weight:400;line-height:1.1;}
      .itb-head small{display:block;color:rgba(255,255,255,.6);font-size:.8rem;margin-top:.3rem;}
      .itb-x{background:none;border:none;color:#fff;font-size:1.8rem;line-height:1;cursor:pointer;}
      .itb-body{padding:1.3rem 1.4rem 1.6rem;}
      .itb-h{font-size:.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold,#b5943b);margin:1.3rem 0 .6rem;}
      .itb-h:first-child{margin-top:0;}
      .itb-seg{display:flex;border:2px solid #e5e0d2;border-radius:6px;overflow:hidden;}
      .itb-seg button{flex:1;border:none;background:#fff;padding:.7rem .5rem;font-weight:600;font-size:.85rem;cursor:pointer;color:#666;font-family:inherit;}
      .itb-seg button.on{background:var(--forest-dark,#1a3a1e);color:#fff;}
      .itb-grid{display:grid;grid-template-columns:1fr 1fr;gap:.8rem;}
      @media(max-width:560px){.itb-grid{grid-template-columns:1fr;}}
      .itb-grid .full{grid-column:1/-1;}
      .itb-l{display:block;font-size:.72rem;font-weight:700;color:#6b7a6d;margin-bottom:.3rem;}
      .itb-i{width:100%;padding:.65rem .75rem;border:1.5px solid #d4dad4;border-radius:6px;font-size:.95rem;font-family:inherit;background:#fff;}
      .itb-i:focus{outline:none;border-color:var(--gold,#b5943b);}
      .itb-fixed{background:#f3f6f3;border:1px solid #e3e7e3;border-radius:6px;padding:.7rem .9rem;font-size:.9rem;font-weight:700;color:var(--forest-dark,#1a3a1e);}
      .itb-btn{width:100%;margin-top:1.2rem;padding:1rem;background:var(--gold,#b5943b);color:#050d06;border:none;font-weight:800;letter-spacing:.1em;text-transform:uppercase;font-size:.85rem;cursor:pointer;border-radius:4px;}
      .itb-btn:disabled{opacity:.6;cursor:wait;}
      .itb-ok{text-align:center;padding:1.5rem 0;}.itb-ok h3{font-family:var(--font-display,Georgia,serif);font-size:1.8rem;margin:.6rem 0;font-weight:400;}
      .req{color:#c0392b;}`;
    document.head.appendChild(s);
  }

  /* ───────── booking form ───────── */
  let S = null;

  async function openBooking({ kind = 'preset', id = '' } = {}) {
    injectStyle();
    const list = await load();
    S = { kind, id: String(id || (list[0] && list[0].id) || ''), base: '', list, busy: false };
    if (!$('it-modal')) {
      const m = document.createElement('div'); m.id = 'it-modal';
      m.innerHTML = '<div class="itb" role="dialog" aria-modal="true" aria-labelledby="itb-title"><div class="itb-head"><div><h2 id="itb-title">Book your itinerary</h2><small>Send us your details and we will contact you soon.</small></div><button type="button" class="itb-x" aria-label="Close">×</button></div><div class="itb-body" id="itb-body"></div></div>';
      document.body.appendChild(m);
      // Deliberately no "click outside to close": a stray click must not wipe a half-filled form. Close with × or Esc.
      m.querySelector('.itb-x').addEventListener('click', () => { if (!S.busy) close(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('it-modal').classList.contains('open') && !S.busy) close(); });
      m.addEventListener('click', onClick);
    }
    render();
    $('it-modal').classList.add('open'); document.body.style.overflow = 'hidden';
  }
  function close() { const m = $('it-modal'); if (m) m.classList.remove('open'); document.body.style.overflow = ''; }

  const current = () => S.list.find(x => String(x.id) === String(S.id));

  function render() {
    const it = current();
    $('itb-body').innerHTML = `
      <div class="itb-seg"><button type="button" data-act="kind" data-k="preset" class="${S.kind === 'preset' ? 'on' : ''}">Our itineraries</button>
        <button type="button" data-act="kind" data-k="custom" class="${S.kind === 'custom' ? 'on' : ''}">Customise your own</button></div>

      ${S.kind === 'preset' ? `
        <div class="itb-h">Choose an itinerary</div>
        <select class="itb-i" id="itb-it">${S.list.map(x => `<option value="${esc(x.id)}" ${String(x.id) === String(S.id) ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select>
        <div class="itb-grid" style="margin-top:.8rem;">
          <div><label class="itb-l">Duration</label><div class="itb-fixed" id="itb-dur">${it ? esc(duration(it)) : '—'}</div></div>
          <div class="full"><label class="itb-l" for="itb-desc">Anything you would like to add? (optional)</label><textarea class="itb-i" id="itb-desc" rows="3" placeholder="Number of people, travel dates, special requests…"></textarea></div>
        </div>` : `
        <div class="itb-h">Your itinerary</div>
        <div class="itb-grid">
          <div class="full"><label class="itb-l" for="itb-base">Start from one of our itineraries (optional)</label>
            <select class="itb-i" id="itb-base"><option value="">No — it is fully my own plan</option>${S.list.map(x => `<option value="${esc(x.id)}" ${String(x.id) === String(S.base) ? 'selected' : ''}>${esc(x.title)} — ${esc(duration(x))}</option>`).join('')}</select>
            <div style="font-size:.76rem;color:#6b7a6d;margin-top:.3rem;">You can use one of ours as a starting point. The days and nights below stay whatever you want them to be.</div></div>
          <div class="full"><label class="itb-l" for="itb-desc">Describe the itinerary you have in mind <span class="req">*</span></label><textarea class="itb-i" id="itb-desc" rows="5" placeholder="Places you want to visit, things to do, number of people, preferred dates…"></textarea></div>
          <div><label class="itb-l" for="itb-days">Days <span class="req">*</span></label><input class="itb-i" id="itb-days" type="number" min="1" max="60" placeholder="e.g. 5"></div>
          <div><label class="itb-l" for="itb-nights">Nights <span class="req">*</span></label><input class="itb-i" id="itb-nights" type="number" min="0" max="60" placeholder="e.g. 4"></div>
          <div class="full"><label class="itb-l" for="itb-pd">Pickup / drop (optional)</label><input class="itb-i" id="itb-pd" placeholder="e.g. Pickup Guwahati airport, drop Bagdogra airport"></div>
        </div>`}

      <div class="itb-h">Your contact details</div>
      <div class="itb-grid">
        <div><label class="itb-l" for="itb-name">Name <span class="req">*</span></label><input class="itb-i" id="itb-name" autocomplete="name"></div>
        <div><label class="itb-l" for="itb-phone">Mobile / WhatsApp number <span class="req">*</span></label><input class="itb-i" id="itb-phone" type="tel" placeholder="+91 XXXXX XXXXX" autocomplete="tel"></div>
        <div><label class="itb-l" for="itb-biz">Business name (optional)</label><input class="itb-i" id="itb-biz" autocomplete="organization" placeholder="For business bookings"></div>
        <div><label class="itb-l" for="itb-gst">GST number (optional)</label><input class="itb-i" id="itb-gst" maxlength="20" autocapitalize="characters" placeholder="15-character GSTIN"></div>
      </div>
      <button type="button" class="itb-btn" id="itb-submit" data-act="submit">Submit booking</button>`;
    const sel = $('itb-it');
    if (sel) sel.addEventListener('change', () => { S.id = sel.value; const it2 = current(); $('itb-dur').textContent = it2 ? duration(it2) : '—'; });
    // Picking a starting itinerary fills in its days and nights, which the guest can still change.
    const base = $('itb-base');
    if (base) base.addEventListener('change', () => {
      S.base = base.value; const b = S.list.find(x => String(x.id) === String(base.value));
      if (b) { $('itb-days').value = b.num_days; $('itb-nights').value = b.num_nights; }
    });
  }

  function onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b || !S) return;
    if (b.dataset.act === 'kind' && !S.busy) { S.kind = b.dataset.k; render(); }
    if (b.dataset.act === 'submit') submit();
  }

  const val = id => ($(id) ? $(id).value.trim() : '');

  // A WhatsApp chat with the business with the request already written (the guest taps Send).
  function whatsAppUrl(out, who) {
    const it = S.kind === 'preset' ? current() : null, base = S.kind === 'custom' ? S.list.find(x => String(x.id) === String(val('itb-base'))) : null;
    const lines = ['Hello Assam Wild Safari, I just sent an itinerary booking request.', '', `Booking: ${out.ref}`];
    if (S.kind === 'preset') lines.push(`Itinerary: ${it ? it.title : ''}`, `Duration: ${it ? duration(it) : ''}`);
    else lines.push('Itinerary: Customised', ...(base ? [`Starting from: ${base.title}`] : []), `Duration: ${val('itb-nights')} nights / ${val('itb-days')} days`, ...(val('itb-pd') ? [`Pickup / drop: ${val('itb-pd')}`] : []));
    if (who.description) lines.push(`${S.kind === 'custom' ? 'My plan' : 'Notes'}: ${who.description}`);
    lines.push('', `Name: ${who.name}`, `Phone: ${who.phone}`);
    if (who.business) lines.push(`Business: ${who.business}`);
    if (who.gst) lines.push(`GST: ${who.gst}`);
    return 'https://wa.me/919365609948?text=' + encodeURIComponent(lines.join('\n'));
  }

  async function submit() {
    if (S.busy) return;
    const name = val('itb-name'), phone = val('itb-phone'), description = val('itb-desc');
    const business = val('itb-biz'), gst = val('itb-gst').replace(/\s+/g, '').toUpperCase();
    let err = '';
    if (S.kind === 'custom') {
      if (description.length < 10) err = 'Please describe the itinerary you have in mind.';
      else if (!(parseInt(val('itb-days'), 10) >= 1)) err = 'Please enter the number of days.';
      else if (!(parseInt(val('itb-nights'), 10) >= 0) || val('itb-nights') === '') err = 'Please enter the number of nights.';
    } else if (!current()) err = 'Please choose an itinerary.';
    if (!err && !name) err = 'Please enter your name.';
    if (!err && phone.replace(/\D/g, '').length < 10) err = 'Please enter a valid mobile number.';
    if (!err && gst && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst)) err = 'Please enter a valid 15-character GST number, or leave it empty.';
    if (!err && gst && !business) err = 'Please enter the business name for the GST number.';
    if (err) { toast(err, 'error'); return; }

    const btn = $('itb-submit'); S.busy = true; btn.disabled = true; btn.textContent = 'Please wait…';
    // Open the WhatsApp tab right now (a browser only allows this straight from the tap); it is filled in once the request is saved.
    const wa = window.open('about:blank', '_blank');
    try {
      const res = await fetch('/.netlify/functions/create-tour-booking', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(S.kind === 'custom'
          ? { kind: 'custom', description, days: val('itb-days'), nights: val('itb-nights'), pickupDrop: val('itb-pd'), baseItineraryId: val('itb-base') || undefined, contact: { name, phone, business, gst } }
          : { kind: 'preset', itineraryId: S.id, description, contact: { name, phone, business, gst } })
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || 'Request failed');
      S.busy = false;
      const waUrl = whatsAppUrl(out, { name, phone, description, business, gst });
      if (wa) wa.location.href = waUrl;
      $('itb-body').innerHTML = `<div class="itb-ok"><div style="font-size:3rem;">✅</div><h3>Booking received</h3>
        <p style="color:#555;line-height:1.7;">Thank you! Your booking <b>${esc(out.ref)}</b> is received.<br>We will contact you soon on <b>${esc(phone)}</b>.</p>
        <p style="color:#555;line-height:1.6;font-size:.9rem;margin-top:.7rem;">To get your request to us right away, send these details on WhatsApp:</p>
        <a href="${esc(waUrl)}" target="_blank" rel="noopener" class="itb-btn" style="display:block;max-width:300px;margin:.8rem auto 0;text-decoration:none;background:#25d366;color:#05340f;">Send details on WhatsApp</a>
        <button type="button" class="itb-btn" style="max-width:240px;background:#fff;border:1.5px solid #cdd5cd;" id="itb-done">Close</button></div>`;
      $('itb-done').addEventListener('click', close);
    } catch (e) {
      if (wa) wa.close();
      S.busy = false; btn.disabled = false; btn.textContent = 'Submit booking';
      toast(e.message || 'Something went wrong. Please try again or call us.', 'error');
    }
  }

  window.Itineraries = { load, renderInto, openBooking, duration };
})();
