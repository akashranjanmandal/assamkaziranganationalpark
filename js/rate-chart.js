/* Pickup & drop rate chart. Reads the live rate card (database) and shows it before the guest books:
     <div id="rate-chart"></div>                 → full chart, grouped by park (Manas / Kaziranga) with a "starting from" price
     <span data-from-park="manas"></span>        → "₹X" (cheapest one-way fare for that park, any route)
   Prices are per vehicle, one way. */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '₹' + Number(n).toLocaleString('en-IN');
  const PARK_NAMES = { manas: 'Manas', kaziranga: 'Kaziranga' };

  function vehicleLabel(r) { return r.vehicle_name + (r.seats ? ` (${r.seats} seater)` : ''); }

  function css() {
    if (document.getElementById('rc-css')) return;
    const st = document.createElement('style'); st.id = 'rc-css';
    st.textContent = `
      .rc-wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.2rem;margin:0 0 1.8rem;}
      .rc-park{border:1px solid #e0dccf;background:#fff;border-radius:6px;overflow:hidden;color:#1d2a1f;}
      .rc-head{display:flex;justify-content:space-between;align-items:flex-end;gap:.6rem;flex-wrap:wrap;padding:1rem 1.2rem;background:#0f2214;color:#fff;}
      .rc-head h3{margin:0;font-size:1.15rem;letter-spacing:.02em;}
      .rc-from{font-size:.8rem;color:rgba(255,255,255,.75);}
      .rc-from b{display:block;font-size:1.35rem;color:#d4af57;line-height:1.1;}
      .rc-route{padding:.9rem 1.2rem 1rem;border-top:1px solid #eee8d8;}
      .rc-route:first-of-type{border-top:0;}
      .rc-rt{font-weight:600;font-size:.92rem;margin-bottom:.45rem;}
      .rc-row{display:flex;justify-content:space-between;gap:1rem;padding:.3rem 0;font-size:.9rem;border-bottom:1px dashed #eee8d8;}
      .rc-row:last-child{border-bottom:0;}
      .rc-row b{white-space:nowrap;}
      .rc-note{grid-column:1/-1;font-size:.82rem;color:#666;margin:0;}
    `;
    document.head.appendChild(st);
  }

  function render(cat) {
    const routes = cat.routes || [], rates = cat.rates || [];
    const byPark = {};
    for (const rt of routes) {
      const list = rates.filter(r => r.route_id === rt.id && r.price != null).sort((a, b) => a.price - b.price);
      if (!list.length) continue;
      (byPark[rt.park_id] = byPark[rt.park_id] || []).push({ rt, list });
    }
    const minOf = park => Math.min(...(byPark[park] || []).flatMap(g => g.list.map(r => r.price)));

    document.querySelectorAll('[data-from-park]').forEach(el => {
      const p = el.getAttribute('data-from-park');
      if (byPark[p]) el.textContent = money(minOf(p));
    });

    const box = document.getElementById('rate-chart');
    if (!box) return;
    css();
    const parks = Object.keys(byPark).sort((a, b) => (PARK_NAMES[a] ? 0 : 1) - (PARK_NAMES[b] ? 0 : 1) || a.localeCompare(b));
    box.innerHTML = `<div class="rc-wrap">` + parks.map(p => `
      <div class="rc-park">
        <div class="rc-head"><h3>${esc(PARK_NAMES[p] || p)} pickup &amp; drop</h3><div class="rc-from">Starting from<b>${money(minOf(p))}</b></div></div>
        ${byPark[p].map(g => `<div class="rc-route"><div class="rc-rt">${esc(g.rt.city)} ⇄ ${esc(g.rt.park_place)}</div>
          ${g.list.map(r => `<div class="rc-row"><span>${esc(vehicleLabel(r))}</span><b>${money(r.price)}</b></div>`).join('')}</div>`).join('')}
      </div>`).join('') + `<p class="rc-note">Fares are per vehicle, one way. For a pickup and a drop, book the trip both ways.</p></div>`;
  }

  async function load() {
    if (!document.getElementById('rate-chart') && !document.querySelector('[data-from-park]')) return;
    try {
      const res = await fetch('/.netlify/functions/public-data?type=catalog');
      const body = await res.json();
      if (body && body.data) render(body.data);
    } catch (e) { /* the chart is a convenience: the booking form still works without it */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
