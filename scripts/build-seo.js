#!/usr/bin/env node
/* Builds the static, search-engine- and AI-friendly pages from the live database:
     /kaziranga-jungle-safari/            park page (zones, timings, rates, FAQ)
     /manas-jungle-safari/                park page
     /north-east-india-tour-packages/     all itineraries (static, crawlable) + one page per itinerary
     /guwahati-to-kaziranga-manas-taxi/   pickup & drop fares
     /sitemap.xml  /robots.txt  /llms.txt  /llms-full.txt
   Run it before every deploy (it reads the database with the service key in .env — read only):
     node scripts/build-seo.js
   Prices, timings, itineraries and rates come from the database, so these pages never go stale. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
for (const l of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const { createClient } = require('@supabase/supabase-js');

const SITE = 'https://assamkaziranganationalpark.com';
const BRAND = 'Assam Wild Safari';
const PHONE1 = '+919365609948', PHONE2 = '+919709884206';
const PHONE1_TXT = '+91 93656 09948', PHONE2_TXT = '+91 97098 84206';
const TODAY = new Date().toISOString().slice(0, 10);

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '₹' + Number(n).toLocaleString('en-IN');
const slugify = s => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const trunc = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const dur = it => `${it.num_nights} Night${it.num_nights === 1 ? '' : 's'} / ${it.num_days} Day${it.num_days === 1 ? '' : 's'}`;
const write = (rel, content) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ───────────────────────── shared page parts ───────────────────────── */

const ORG = {
  '@type': ['TravelAgency', 'LocalBusiness'],
  '@id': SITE + '/#business',
  name: BRAND,
  alternateName: 'Manas Holidays',
  url: SITE + '/',
  logo: SITE + '/images/logo.jpeg',
  image: SITE + '/images/kaziranga.jpg',
  telephone: PHONE1,
  address: { '@type': 'PostalAddress', addressLocality: 'Abhayapuri', addressRegion: 'Assam', addressCountry: 'IN' },
  areaServed: ['Kaziranga National Park', 'Manas National Park', 'Assam', 'North East India'],
  description: 'Jeep safari booking for Kaziranga and Manas National Parks, North East India tour packages, and airport and railway-station pickup and drop in Assam.',
  contactPoint: [{ '@type': 'ContactPoint', telephone: PHONE1, contactType: 'reservations', areaServed: 'IN', availableLanguage: ['English', 'Hindi', 'Assamese', 'Bengali'] },
                 { '@type': 'ContactPoint', telephone: PHONE2, contactType: 'customer service', areaServed: 'IN' }]
};

function breadcrumb(items) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: SITE + it[1] })) };
}
function faqSchema(faq) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) };
}
const faqHtml = faq => `<div class="seo-faq">${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join('')}</div>`;

const NAV = `
  <nav class="navbar solid">
    <a href="/" class="nav-logo-group">
      <img src="/images/logo.jpeg" alt="${BRAND} logo" class="nav-logo-img" width="48" height="48">
      <div class="nav-logo-text">
        <span class="nav-logo-name">Assam <span>Wild</span> Safari</span>
        <span class="nav-logo-sub">Northeast India's Premium Safari</span>
      </div>
    </a>
    <div class="hamburger"><span></span><span></span><span></span></div>
  </nav>
  <ul class="nav-links">
    <button class="nav-close-btn" id="nav-close-btn" aria-label="Close menu">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    </button>
    <li><a href="/">Home</a></li>
    <li><a href="/kaziranga-jungle-safari/">Kaziranga Safari</a></li>
    <li><a href="/manas-jungle-safari/">Manas Safari</a></li>
    <li><a href="/north-east-india-tour-packages/">Tour Packages</a></li>
    <li><a href="/pages/car-rental.html">Car Rental</a></li>
    <li><a href="/pages/reviews.html">Reviews</a></li>
    <li class="nav-cta-item"><a href="/pages/booking.html" class="nav-cta">Book Now</a></li>
  </ul>
  <div class="nav-overlay"></div>`;

const FOOTER = `
  <footer class="footer">
    <div class="footer-inner">
      <div>
        <div class="footer-logo-group">
          <img src="/images/logo.jpeg" alt="${BRAND} logo" class="footer-logo-img" width="64" height="64" loading="lazy">
          <div class="powered-by">Powered by Manas Holidays</div>
        </div>
        <p class="footer-desc">Jeep safari booking for Kaziranga and Manas National Parks, North East India tour packages and airport pickup &amp; drop in Assam.</p>
        <p class="footer-contact-info" style="font-size:0.85rem;color:rgba(255,255,255,0.5);margin-top:1rem;">Abhayapuri, Assam</p>
      </div>
      <div>
        <div class="footer-col-title">Safaris</div>
        <ul class="footer-links">
          <li><a href="/kaziranga-jungle-safari/">Kaziranga Jeep Safari</a></li>
          <li><a href="/manas-jungle-safari/">Manas Jeep Safari</a></li>
          <li><a href="/pages/booking.html">Book a Safari</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-col-title">Travel</div>
        <ul class="footer-links">
          <li><a href="/north-east-india-tour-packages/">North East Tour Packages</a></li>
          <li><a href="/guwahati-to-kaziranga-manas-taxi/">Airport Pickup &amp; Drop</a></li>
          <li><a href="/pages/car-rental.html">Car Rental</a></li>
          <li><a href="/pages/reviews.html">Guest Reviews</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-col-title">Contact</div>
        <ul class="footer-links">
          <li><a href="tel:${PHONE1}">${PHONE1_TXT}</a></li>
          <li><a href="tel:${PHONE2}">${PHONE2_TXT}</a></li>
          <li><a href="https://wa.me/919365609948" target="_blank" rel="noopener">WhatsApp Us</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">© 2026 ${BRAND}. Kaziranga &amp; Manas jungle safari, North East India tours.</div>
  </footer>`;

function page({ title, description, path: urlPath, image = '/images/kaziranga.jpg', jsonld = [], body, heroImage }) {
  const url = SITE + urlPath;
  const ld = [{ '@context': 'https://schema.org', ...ORG }, ...jsonld];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${BRAND}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}${image}">
  <meta property="og:locale" content="en_IN">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${SITE}${image}">
  <meta name="theme-color" content="#050d06">
  <link rel="icon" href="/images/logo.jpeg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/seo.css">
${ld.map(o => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body>${NAV}
${body.replace('<!--HERO_IMG-->', heroImage ? `style="--seo-hero-img:url('${heroImage}')"` : '')}
${FOOTER}
  <script src="/js/main.js"></script>
</body>
</html>
`;
}

const heroBlock = ({ crumbs, h1, lead, ctas, img }) => `
  <header class="seo-hero" ${img ? `style="--seo-hero-img:url('${img}')"` : ''}>
    <div class="seo-crumbs">${crumbs.map((c, i) => c[1] ? `<a href="${c[1]}">${esc(c[0])}</a>` : esc(c[0])).join(' › ')}</div>
    <h1>${esc(h1)}</h1>
    <p class="lead">${lead}</p>
    <div class="seo-cta-row">${ctas.map(c => `<a href="${c[1]}" class="${c[2] || 'btn-primary'}">${esc(c[0])}</a>`).join('')}</div>
  </header>`;

const ctaBand = (h, p, href, label) => `
  <section class="seo-band"><h2>${esc(h)}</h2><p>${p}</p><a href="${href}" class="btn-primary">${esc(label)}</a></section>`;

/* ───────────────────────── data ───────────────────────── */

async function main() {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const get = async (q) => { const r = await q; if (r.error) throw new Error(r.error.message); return r.data; };
  const [parks, zones, slots, routes, rates, its] = await Promise.all([
    get(db.from('parks').select('*').eq('active', true).order('sort_order')),
    get(db.from('safari_zones').select('*').eq('active', true).order('sort_order')),
    get(db.from('safari_slots').select('*').eq('active', true).order('sort_order')),
    get(db.from('transfer_routes').select('*').eq('active', true).order('sort_order')),
    get(db.from('transfer_rates').select('*').eq('active', true).order('price')),
    get(db.from('itineraries').select('*').eq('active', true).order('sort_order'))
  ]);
  const park = id => parks.find(p => p.id === id);
  const minRate = pid => Math.min(...routes.filter(r => r.park_id === pid).flatMap(r => rates.filter(x => x.route_id === r.id).map(x => x.price)));
  its.forEach(it => { it.slug = slugify(it.title); });

  const urls = [];   // sitemap entries: [path, changefreq, priority]
  const add = (p, f, pr) => urls.push([p, f, pr]);

  /* ─────────── park pages ─────────── */
  const PARK_COPY = {
    kaziranga: {
      path: '/kaziranga-jungle-safari/', name: 'Kaziranga', full: 'Kaziranga National Park', img: '/images/kaziranga.jpg',
      title: 'Kaziranga Jeep Safari Booking, Rates & Timings | Assam Wild Safari',
      h1: 'Kaziranga Jeep Safari Booking',
      lead: 'Book a private or shared jeep safari in Kaziranga National Park, Assam — home of the Indian one-horned rhinoceros. Choose your range, date and time and send your request online.',
      about: `<p><strong>Kaziranga National Park</strong> in Assam is a UNESCO World Heritage Site and a Tiger Reserve, famous for holding the largest population of the Indian one-horned rhinoceros in the world. The park's tall elephant grass, wetlands and woodland also shelter wild Asian elephants, wild water buffalo, swamp deer, hog deer, tigers and a very large number of resident and migratory birds.</p>
        <p>A jeep safari is the best way to see the park. Safaris run in separate ranges — the Central (Kohora), Western (Bagori), Eastern (Agoratoli) and Burapahar ranges — each with its own landscape and wildlife. We help you pick the range that suits your dates and interests and arrange your safari booking.</p>`,
      season: 'Kaziranga is generally open for safaris from about November to April, when the park is dry enough for jeeps. It is closed during the monsoon (roughly May to October). The exact opening dates are decided each year by the forest department, so tell us your travel dates and we will confirm.',
      reach: 'Kaziranga (Kohora) is on NH-715 in Assam. The nearest large airport is Guwahati (roughly 5 hours by road); Jorhat airport is closer. We arrange Guwahati airport / railway station ⇄ Kaziranga pickup and drop with fixed fares.',
      wildlife: `<p>Kaziranga is best known for the <strong>Indian one-horned rhinoceros</strong>, which is seen on most safaris. The park also has <strong>wild Asian elephants</strong>, <strong>wild water buffalo</strong>, <strong>swamp deer</strong> (barasingha), <strong>hog deer</strong>, and a healthy <strong>tiger</strong> population that is seen only occasionally. Bird lovers can look for Bengal florican, swamp francolin, pelicans, storks, adjutants and migratory ducks in the cooler months.</p>`,
      zonesGuide: `<ul><li><strong>Central Range (Kohora):</strong> the main and most visited range, with open grassland and wetlands where rhinos are commonly seen.</li><li><strong>Western Range (Bagori):</strong> known for a high density of rhinos and good wetland birdlife.</li><li><strong>Eastern Range (Agoratoli):</strong> quieter, with large wetlands and migratory birds.</li><li><strong>Burapahar Range:</strong> more forested and less crowded, a good choice if you have done the other ranges.</li></ul><p>Not sure which to pick? Tell us your dates and what you most want to see and we will suggest a range.</p>`,
      carry: 'Carry the original ID you uploaded (Aadhaar for Indian guests; passport or another valid ID for foreign guests), comfortable clothes in muted colours such as green, brown or khaki, a hat, sunscreen, mosquito repellent, drinking water, binoculars and a camera. Mornings can be cool from November to February, so bring a light jacket.',
      distance: 'From Guwahati to Kaziranga (Kohora) is roughly 190–220 km and takes about 5 hours by road via NH-715, depending on traffic. Guwahati airport is the main gateway; Jorhat airport is nearer if you are coming from upper Assam. Our <a href="/guwahati-to-kaziranga-manas-taxi/">pickup &amp; drop service</a> runs Kaziranga ⇄ Guwahati airport / railway station at fixed fares.',
      elephant: 'Elephant rides in Kaziranga are early-morning rides run by the forest department, subject to availability and park rules. Several of our itineraries include an early elephant ride before the jeep safari. Tell us when you contact us and we will check availability and the fee for your dates.',
      related: [['/manas-jungle-safari/', 'Manas jeep safari'], ['/guwahati-to-kaziranga-manas-taxi/', 'Airport pickup & drop fares'], ['/north-east-india-tour-packages/', 'North East tour packages']]
    },
    manas: {
      path: '/manas-jungle-safari/', name: 'Manas', full: 'Manas National Park', img: '/images/manas-guideliness.jpg',
      title: 'Manas Jungle Safari Booking, Rates & Zones | Assam Wild Safari',
      h1: 'Manas National Park Jeep Safari Booking',
      lead: 'Book a private or shared jeep safari in Manas National Park, Assam — a UNESCO World Heritage Site and Tiger Reserve on the Bhutan border. Send your safari request online in minutes.',
      about: `<p><strong>Manas National Park</strong> lies in the Himalayan foothills of Assam on the border with Bhutan. It is a UNESCO World Heritage Site, a Tiger Reserve, an Elephant Reserve and a Biosphere Reserve. Grassland, forest and river habitats support tigers, Asian elephants, greater one-horned rhinoceros, wild water buffalo, the rare golden langur, the pygmy hog and a rich variety of birds, including the Bengal florican.</p>
        <p>Jeep safaris run in several zones — Bansbari, Bhuyan Para, Kahitama and Kokilabari, plus a Bansbari to Panbang (Bhutan) day trip for Indian guests. We help you choose a zone and arrange your safari booking and ID uploads in one simple form.</p>`,
      season: 'Manas is generally open for safaris from about November to April, with the park closed during the monsoon months. Dates are fixed by the forest department each year, so tell us your travel dates and we will confirm.',
      reach: 'Manas is in the Bodoland (BTR) region of western Assam, on the Bhutan border. Barpeta Road and New Bongaigaon are the nearest railway stations and Guwahati is the nearest major airport (roughly 4 hours by road). We arrange Guwahati, Bongaigaon, Barpeta Road and Kaziranga pickup and drop to Manas with fixed fares.',
      wildlife: `<p>Manas is one of the few places where you can see the rare <strong>golden langur</strong>, along with the <strong>pygmy hog</strong>, <strong>Asian elephant</strong>, <strong>greater one-horned rhinoceros</strong>, <strong>wild water buffalo</strong>, <strong>Bengal tiger</strong> and the endangered <strong>Bengal florican</strong>. More than 450 bird species have been recorded, including hornbills, giant kingfishers and many forest birds, and the Manas River and the Bhutan hills make a beautiful backdrop.</p>`,
      zonesGuide: `<ul><li><strong>Bansbari Zone:</strong> the most popular zone for a first safari, with grassland and forest edges.</li><li><strong>Bhuyan Para Range:</strong> a quieter range with forest and river scenery.</li><li><strong>Kahitama Zone:</strong> a longer, more remote drive for travellers who want fewer vehicles.</li><li><strong>Kokilabari Zone:</strong> a whole-day safari for guests who want a full day in the park.</li><li><strong>Bansbari to Panbang (Bhutan):</strong> a day trip across the border into Bhutan, for Indian guests only.</li></ul><p>Tell us your dates and what you want to see and we will suggest a zone.</p>`,
      carry: 'Carry the original ID you uploaded (Aadhaar for Indian guests; passport or another valid ID for foreign guests), comfortable clothes in muted colours, a hat, sunscreen, mosquito repellent, drinking water, binoculars and a camera. Remember that Manas charges a fee per camera, which is added to your booking total. Mornings can be cool from November to February, so bring a light jacket.',
      distance: 'From Guwahati to Manas is roughly 140–160 km and takes about 3.5–4 hours by road, depending on traffic and the zone you are visiting. Barpeta Road and New Bongaigaon are the nearest railway stations. Our <a href="/guwahati-to-kaziranga-manas-taxi/">pickup &amp; drop service</a> covers Guwahati, Bongaigaon, Barpeta Road and Kaziranga to Manas at fixed fares.',
      elephant: 'Elephant rides in Manas are early-morning rides, subject to availability and park rules. Our Manas itineraries list the elephant ride as an optional extra at around 6 AM, before the jeep safari. Tell us when you contact us and we will check availability and the fee for your dates.',
      related: [['/kaziranga-jungle-safari/', 'Kaziranga jeep safari'], ['/guwahati-to-kaziranga-manas-taxi/', 'Airport pickup & drop fares'], ['/north-east-india-tour-packages/', 'North East tour packages']]
    }
  };

  for (const pid of ['kaziranga', 'manas']) {
    const c = PARK_COPY[pid], pk = park(pid); if (!pk) continue;
    const zs = zones.filter(z => z.park_id === pid);
    const sharedZone = zs.find(z => z.id === pk.shared_zone_id);
    const privSlots = slots.filter(s => s.park_id === pid && s.for_type === 'private');
    const sharedSlots = slots.filter(s => s.park_id === pid && s.for_type === 'shared');
    const hasCam = pk.camera_still_indian != null || pk.camera_video_indian != null;
    const minPriv = Math.min(...zs.map(z => z.price_indian));

    const faq = [
      [`How much does a ${c.name} jeep safari cost?`, `A private jeep safari in ${c.full} starts from ${money(minPriv)} per jeep for Indian guests (up to ${Math.max(...zs.map(z => z.max_per_jeep))} people per jeep)${pk.shared_price_per_person ? `, and a shared jeep seat is ${money(pk.shared_price_per_person)} per person for Indian guests` : ''}${pk.shared_price_foreigner ? ` (${money(pk.shared_price_foreigner)} per person for foreign guests, including the foreigner entry fee)` : ''}. The full rate card is on this page.`],
      [`How do I book a safari in ${c.full}?`, `Choose your zone, date and time on our <a href="/pages/booking.html?park=${pid}">safari booking page</a>, enter the guest details and upload the ID documents. Nothing is paid at that stage: we check seat availability for your slot and then send a secure payment link on WhatsApp. Your safari is confirmed once the payment is received.`],
      [`What documents are needed for ${c.name} safari?`, pid === 'kaziranga'
        ? 'Every guest needs an ID: Aadhaar for Indian guests; passport (or another valid ID card) for foreign guests. Please carry the same original ID on the day of the safari.'
        : 'The primary guest uploads an ID — Aadhaar for Indian guests; passport (or another valid ID card) for foreign guests — and should carry the original ID on the day of the safari.'],
      [`What is the best time to visit ${c.full}?`, c.season],
      [`Can foreign tourists book a ${c.name} jeep safari?`, `Yes. Foreign guests can book private jeeps${pk.shared_price_foreigner ? ' and shared seats' : ''}. Foreign guests pay a higher foreigner rate that includes the park's foreigner entry fee, and upload a passport or other valid ID.`],
      ...(hasCam ? [[`Are camera charges included in the ${c.name} safari booking?`, `${c.full} charges a fee per camera: still camera ${money(pk.camera_still_indian)} (Indian) / ${money(pk.camera_still_foreigner)} (foreigner), and video camera ${money(pk.camera_video_indian)} (Indian) / ${money(pk.camera_video_foreigner)} (foreigner). You choose the number of cameras while booking and the amount is added to your total.`]] : []),
      [`How do I reach ${c.full}?`, c.reach],
      [`How far is ${c.full} from Guwahati?`, c.distance],
      [`Is there an elephant safari in ${c.full}?`, c.elephant],
      [`How can I buy ${c.name} National Park safari tickets?`, `Send a safari request on our <a href="/pages/booking.html?park=${pid}">booking page</a> with your zone, date and time. We check seat availability for your slot and then send a secure payment link on WhatsApp, so there is nothing to pay on the website when you send the request.`],
      [`What should I carry for a ${c.name} jeep safari?`, c.carry]
    ];

    const zoneRows = zs.map(z => `<tr><td>${esc(z.name)}${z.note ? `<br><small>${esc(z.note)}</small>` : ''}</td><td class="num">${money(z.price_indian)}</td><td class="num">${z.price_foreigner != null ? money(z.price_foreigner) : 'Indian guests only'}</td><td class="num">${z.max_per_jeep}</td></tr>`).join('');

    const body = `
${heroBlock({ crumbs: [['Home', '/'], [`${c.name} jeep safari`]], h1: c.h1, lead: c.lead,
      ctas: [[`Book ${c.name} safari`, `/pages/booking.html?park=${pid}`], ['Call / WhatsApp', 'https://wa.me/919365609948', 'btn-ghost']], img: c.img })}
  <main class="seo-main">
    <h2>About ${esc(c.full)}</h2>
    ${c.about}
    <div class="seo-facts">
      <div class="seo-fact"><b>Private jeep</b>from ${money(minPriv)} / jeep</div>
      ${pk.shared_price_per_person ? `<div class="seo-fact"><b>Shared jeep</b>${money(pk.shared_price_per_person)} / person${pk.shared_price_foreigner ? ` · foreigner ${money(pk.shared_price_foreigner)}` : ''}</div>` : ''}
      <div class="seo-fact"><b>Best season</b>November – April</div>
      ${pk.closed_weekday != null ? `<div class="seo-fact"><b>Closed on</b>${WEEKDAYS[pk.closed_weekday]}s</div>` : `<div class="seo-fact"><b>Open</b>All week in season</div>`}
    </div>

    <h2>${esc(c.name)} jeep safari rates (private jeep)</h2>
    <p>Private jeep prices are per jeep, not per person. Each jeep takes up to the number of guests shown.</p>
    <div class="seo-table-wrap"><table class="seo-table"><thead><tr><th>Zone / range</th><th class="num">Indian guests</th><th class="num">Foreign guests</th><th class="num">Max guests / jeep</th></tr></thead><tbody>${zoneRows}</tbody></table></div>

    ${pk.shared_price_per_person ? `<h2>${esc(c.name)} shared jeep safari</h2>
    <p>Travelling solo or as a couple? Join a shared jeep: <strong>${money(pk.shared_price_per_person)} per person</strong> for Indian guests${pk.shared_price_foreigner ? ` and <strong>${money(pk.shared_price_foreigner)} per person</strong> for foreign guests (foreigner entry fee included)` : ''}. Shared jeeps run in ${sharedZone ? `the ${esc(sharedZone.name)}` : 'one fixed zone'}, with 1–3 adults per booking.</p>` : ''}

    <h2>Wildlife you can see in ${esc(c.name)}</h2>
    ${c.wildlife}

    <h2>${esc(c.name)} safari zones explained</h2>
    ${c.zonesGuide}

    <h2>Safari timings</h2>
    <h3>Private jeep</h3>
    <ul>${privSlots.map(s => `<li><strong>${esc(s.name)}</strong> — ${esc(s.time_range)}</li>`).join('')}</ul>
    ${sharedSlots.length ? `<h3>Shared jeep</h3><ul>${sharedSlots.map(s => `<li><strong>${esc(s.name)}</strong> — ${esc(s.time_range)}</li>`).join('')}</ul>` : ''}
    ${hasCam ? `<h2>Camera charges</h2>
    <p>${esc(c.full)} charges a fee per camera, added to your booking total: still camera ${money(pk.camera_still_indian)} (Indian) / ${money(pk.camera_still_foreigner)} (foreigner); video camera ${money(pk.camera_video_indian)} (Indian) / ${money(pk.camera_video_foreigner)} (foreigner).</p>` : ''}

    <h2>How to book your ${esc(c.name)} safari</h2>
    <ol style="padding-left:1.3rem;">
      <li>Open the <a href="/pages/booking.html?park=${pid}">${esc(c.name)} safari booking form</a> and pick private or shared, your zone, date and time.</li>
      <li>Add every guest's name and age and upload ID documents (Aadhaar for Indian guests; passport or other ID for foreign guests).</li>
      <li>Submit the request — no payment on the website. We check availability and send a secure payment link on WhatsApp.</li>
      <li>Pay online and receive your confirmation, with vehicle and driver details shared before the safari.</li>
    </ol>

    <h2>What to carry</h2>
    <p>${c.carry}</p>

    <h2>Season, getting there and pickup</h2>
    <p>${c.season}</p>
    <p>${c.reach}</p>
    <p>${c.distance}</p>
    <p>See the <a href="/guwahati-to-kaziranga-manas-taxi/">pickup &amp; drop fares</a>.</p>

    <h2>${esc(c.name)} safari — frequently asked questions</h2>
    ${faqHtml(faq)}

    <h2>Plan more of North East India</h2>
    <ul>${c.related.map(r => `<li><a href="${r[0]}">${esc(r[1])}</a></li>`).join('')}</ul>
  </main>
  ${ctaBand(`Ready for your ${c.name} safari?`, 'Send your request online — we check your slot and reply on WhatsApp.', `/pages/booking.html?park=${pid}`, `Book ${c.name} safari`)}`;

    const ld = [
      breadcrumb([['Home', '/'], [`${c.name} jeep safari`, c.path]]),
      faqSchema(faq),
      { '@context': 'https://schema.org', '@type': 'TouristAttraction', name: c.full, url: SITE + c.path, image: SITE + c.img,
        description: c.lead, touristType: 'Wildlife and nature lovers', isAccessibleForFree: false,
        address: { '@type': 'PostalAddress', addressRegion: 'Assam', addressCountry: 'IN' } },
      { '@context': 'https://schema.org', '@type': 'Service', serviceType: `${c.name} jeep safari booking`, name: `${c.full} jeep safari`, provider: { '@id': SITE + '/#business' },
        areaServed: c.full, url: SITE + c.path,
        offers: { '@type': 'Offer', priceCurrency: 'INR', price: String(minPriv), priceSpecification: { '@type': 'PriceSpecification', priceCurrency: 'INR', price: String(minPriv), valueAddedTaxIncluded: false, unitText: 'per private jeep (from)' }, availability: 'https://schema.org/InStock', url: SITE + '/pages/booking.html?park=' + pid } }
    ];
    write(c.path.slice(1) + 'index.html', page({ title: c.title, description: trunc(`${c.lead} Private jeep from ${money(minPriv)}${pk.shared_price_per_person ? `, shared seat ${money(pk.shared_price_per_person)}` : ''}. Zones, timings, camera fees and FAQ.`, 158), path: c.path, image: c.img, jsonld: ld, body }));
    add(c.path, 'weekly', '0.95');
  }

  /* ─────────── itinerary pages + hub ─────────── */
  const HUB = '/north-east-india-tour-packages/';
  const summaryOf = it => {
    const d = Array.isArray(it.days) ? it.days : [];
    return trunc((it.route ? it.route + '. ' : '') + (d[0] ? d[0].text : ''), 170);
  };
  for (const it of its) {
    const p = `${HUB}${it.slug}/`;
    const days = Array.isArray(it.days) ? it.days : [], sections = Array.isArray(it.sections) ? it.sections : [];
    const others = its.filter(x => x.id !== it.id).slice(0, 4);
    const faq = [
      [`How long is the ${it.title} tour?`, `${it.title} is a ${dur(it)} itinerary.${it.route ? ' The route is ' + esc(it.route) + '.' : ''}`],
      [`How do I book the ${it.title} package?`, `Press <em>Book this itinerary</em>, share your name and mobile number and send the request. We will contact you on WhatsApp to confirm dates, the vehicle and the price. Nothing is paid on the website.`],
      ['Is pickup and drop included?', 'Pickup and drop can be arranged from the airport or railway station named in the itinerary. Tell us your arrival and departure details when you book.']
    ];
    const body = `
${heroBlock({ crumbs: [['Home', '/'], ['Tour packages', HUB], [it.title]], h1: it.title, lead: esc(`${dur(it)}${it.route ? ' · ' + it.route : ''}`),
      ctas: [['Book this itinerary', `/pages/itineraries.html?book=${it.id}`], ['Ask on WhatsApp', 'https://wa.me/919365609948', 'btn-ghost']], img: '/images/kaziranga-shillong-tour.jpg' })}
  <main class="seo-main">
    <h2>${esc(it.title)} — ${esc(dur(it))}</h2>
    ${it.badge ? `<p><strong>${esc(it.badge)}</strong></p>` : ''}
    ${it.route ? `<p><strong>Route:</strong> ${esc(it.route)}</p>` : ''}
    <h2>Day-by-day itinerary</h2>
    ${days.map((d, i) => `<div class="seo-day"><b>Day ${i + 1}: ${esc(d.title)}</b><p>${esc(d.text)}</p></div>`).join('')}
    ${sections.map(s => `<h2>${esc(s.heading)}</h2><ul>${(s.items || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}
    ${it.notes ? `<h2>Good to know</h2><p>${esc(it.notes)}</p>` : ''}
    <h2>Frequently asked questions</h2>
    ${faqHtml(faq)}
    <h2>More North East tour packages</h2>
    <ul>${others.map(o => `<li><a href="${HUB}${o.slug}/">${esc(o.title)}</a> — ${esc(dur(o))}</li>`).join('')}<li><a href="${HUB}">See all North East India tour packages</a></li></ul>
  </main>
  ${ctaBand('Interested in this trip?', 'Send a request and we will confirm dates, vehicle and price on WhatsApp.', `/pages/itineraries.html?book=${it.id}`, 'Book this itinerary')}`;
    const ld = [
      breadcrumb([['Home', '/'], ['Tour packages', HUB], [it.title, p]]),
      faqSchema(faq),
      { '@context': 'https://schema.org', '@type': 'TouristTrip', name: it.title, url: SITE + p, description: summaryOf(it),
        touristType: 'Wildlife and nature lovers', provider: { '@id': SITE + '/#business' },
        itinerary: { '@type': 'ItemList', numberOfItems: days.length, itemListElement: days.map((d, i) => ({ '@type': 'ListItem', position: i + 1, name: d.title, description: d.text })) } }
    ];
    write(p.slice(1) + 'index.html', page({ title: trunc(`${it.title} — ${dur(it)} Tour Package | ${BRAND}`, 70), description: trunc(`${it.title}: ${dur(it)} North East India itinerary. ${summaryOf(it)}`, 158), path: p, image: '/images/kaziranga-shillong-tour.jpg', jsonld: ld, body }));
    add(p, 'monthly', '0.8');
  }

  const hubFaq = [
    ['What North East India tour packages do you offer?', `We offer ${its.length} ready itineraries — including wildlife tours of Manas and Kaziranga, Meghalaya (Shillong, Dawki, Mawlynnong, Cherrapunji), Arunachal Pradesh (Tawang, Anini) and Bhutan-side trips — and we can customise any route.`],
    ['Can I customise my North East itinerary?', 'Yes. Pick one of our itineraries as a starting point or describe your own plan with the number of days and nights, and we will send you a quote.'],
    ['How do I book a North East tour?', 'Choose an itinerary, press <em>Book this itinerary</em> and send your name and mobile number. We contact you on WhatsApp to confirm. Nothing is paid on the website when you send a request.'],
    ['Do I need a permit for Arunachal Pradesh?', 'Indian tourists need an Inner Line Permit (ILP) for Arunachal Pradesh. Rules for foreign nationals are different — please ask us before you plan.'],
    ['Do you arrange airport and railway station pickup?', 'Yes. We arrange pickup and drop from Guwahati and other airports and railway stations, with fixed fares for Manas and Kaziranga routes.']
  ];
  const hubBody = `
${heroBlock({ crumbs: [['Home', '/'], ['Tour packages']], h1: 'North East India Tour Packages & Itineraries',
    lead: 'Wildlife, mountain and culture itineraries across Assam, Meghalaya, Arunachal Pradesh and Bhutan — with Kaziranga and Manas safaris, pickup and drop and a vehicle arranged for you. Or build your own route.',
    ctas: [['Customise my route', '/pages/itineraries.html'], ['Ask on WhatsApp', 'https://wa.me/919365609948', 'btn-ghost']], img: '/images/kaziranga-shillong-tour.jpg' })}
  <main class="seo-main">
    <h2>Our North East India itineraries</h2>
    <p>Every itinerary below lists the full day-by-day plan. Pick one and send a request, or ask us to change the route, the days or the vehicle.</p>
    <div class="seo-cards">
      ${its.map(it => `<a class="seo-card" href="${HUB}${it.slug}/"><span class="tag">${esc(dur(it))}</span><h3>${esc(it.title)}</h3><p>${esc(summaryOf(it))}</p><span class="more">View itinerary →</span></a>`).join('')}
    </div>
    <h2>Jungle safari + North East tour</h2>
    <p>Many of our itineraries include a jeep safari. You can also book a safari on its own: <a href="/kaziranga-jungle-safari/">Kaziranga jeep safari</a> or <a href="/manas-jungle-safari/">Manas jeep safari</a>, and add <a href="/guwahati-to-kaziranga-manas-taxi/">airport pickup &amp; drop</a>.</p>
    <h2>North East tour packages — frequently asked questions</h2>
    ${faqHtml(hubFaq)}
  </main>
  ${ctaBand('Want your own route?', 'Tell us the places, days and vehicle — we will plan and quote it.', '/pages/itineraries.html', 'Customise your route')}`;
  write(HUB.slice(1) + 'index.html', page({
    title: 'North East India Tour Packages & Itineraries | Assam Wild Safari',
    description: trunc(`North East India tour packages: ${its.slice(0, 4).map(i => i.title).join('; ')} and more. Day-by-day itineraries, Kaziranga & Manas safaris, pickup & drop. Customise your route.`, 158),
    path: HUB, image: '/images/kaziranga-shillong-tour.jpg', body: hubBody,
    jsonld: [breadcrumb([['Home', '/'], ['Tour packages', HUB]]), faqSchema(hubFaq),
      { '@context': 'https://schema.org', '@type': 'ItemList', name: 'North East India tour packages', itemListElement: its.map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + HUB + it.slug + '/', name: it.title })) }]
  }));
  add(HUB, 'weekly', '0.9');

  /* ─────────── taxi / pickup & drop ─────────── */
  const TAXI = '/guwahati-to-kaziranga-manas-taxi/';
  const taxiFaq = [
    ['How much is a taxi from Guwahati airport to Manas or Kaziranga?', `Fares are fixed per vehicle and one way. Pickup and drop to Manas start from ${money(minRate('manas'))} and Kaziranga ⇄ Guwahati airport / railway station starts from ${money(minRate('kaziranga'))}. The full rate card is on this page.`],
    ['Is the fare per person or per vehicle?', 'Per vehicle, one way. For a pickup and a drop, book the trip both ways.'],
    ['How do I book a pickup or drop?', 'Open the <a href="/pages/car-rental.html?mode=pickup">pickup &amp; drop form</a>, choose the route and vehicle, add your dates and contact number. We will contact you on WhatsApp to confirm. No payment is taken on the website.'],
    ['How far is Guwahati airport from Kaziranga and Manas?', 'Guwahati to Kaziranga (Kohora) is roughly 190–220 km, about 5 hours by road. Guwahati to Manas is roughly 140–160 km, about 3.5–4 hours. Timings change with traffic and road conditions.'],
    ['Which vehicles are available?', `Swift Dzire, Ertiga, Innova, Tempo Traveller (17 and 26 seaters), Urbania and Winger on selected routes — see the table for the vehicle available on each route.`],
    ['Can I combine the taxi with a safari booking?', `Yes. Book your <a href="/kaziranga-jungle-safari/">Kaziranga</a> or <a href="/manas-jungle-safari/">Manas</a> safari first, then add pickup and drop for the same dates.`]
  ];
  const taxiBody = `
${heroBlock({ crumbs: [['Home', '/'], ['Pickup & drop']], h1: 'Guwahati Airport to Kaziranga & Manas Taxi', lead: 'Fixed-fare pickup and drop between airports, railway stations and Manas / Kaziranga National Parks in Assam. Choose your route and vehicle and send your request online.',
    ctas: [['Book pickup / drop', '/pages/car-rental.html?mode=pickup'], ['Ask on WhatsApp', 'https://wa.me/919365609948', 'btn-ghost']], img: '/images/kaziranga.jpg' })}
  <main class="seo-main">
    <h2>Pickup &amp; drop fares</h2>
    <p>Fares are per vehicle, one way. Starting from <strong>${money(minRate('manas'))}</strong> for Manas and <strong>${money(minRate('kaziranga'))}</strong> for Kaziranga.</p>
    ${routes.map(r => { const rs = rates.filter(x => x.route_id === r.id); if (!rs.length) return ''; return `<h3>${esc(r.city)} ⇄ ${esc(r.park_place)}</h3>
    <div class="seo-table-wrap"><table class="seo-table"><thead><tr><th>Vehicle</th><th class="num">One-way fare</th></tr></thead><tbody>${rs.map(x => `<tr><td>${esc(x.vehicle_name)}${x.seats ? ` (${x.seats} seater)` : ''}</td><td class="num">${money(x.price)}</td></tr>`).join('')}</tbody></table></div>`; }).join('')}
    <p class="seo-note">Fares are fixed per vehicle and may change; we confirm the final fare when we contact you. For other routes or a car for a full itinerary, see <a href="/pages/car-rental.html">car rental</a>.</p>
    <h2>Pickup &amp; drop — frequently asked questions</h2>
    ${faqHtml(taxiFaq)}
  </main>
  ${ctaBand('Need a pickup or drop?', 'Choose your route and vehicle and send your request — we reply on WhatsApp.', '/pages/car-rental.html?mode=pickup', 'Book pickup / drop')}`;
  write(TAXI.slice(1) + 'index.html', page({
    title: 'Guwahati to Kaziranga & Manas Taxi Fares | Assam Wild Safari',
    description: trunc(`Taxi from Guwahati airport & railway station to Kaziranga and Manas. Fixed fares from ${money(Math.min(minRate('manas'), minRate('kaziranga')))} per vehicle. Dzire, Ertiga, Innova, Tempo Traveller.`, 158),
    path: TAXI, body: taxiBody,
    jsonld: [breadcrumb([['Home', '/'], ['Pickup & drop', TAXI]]), faqSchema(taxiFaq),
      { '@context': 'https://schema.org', '@type': 'Service', serviceType: 'Airport and railway station pickup and drop taxi', name: 'Guwahati to Kaziranga and Manas taxi', provider: { '@id': SITE + '/#business' }, areaServed: ['Guwahati', 'Kaziranga', 'Manas', 'Bongaigaon', 'Barpeta Road'], url: SITE + TAXI,
        offers: { '@type': 'Offer', priceCurrency: 'INR', price: String(Math.min(minRate('manas'), minRate('kaziranga'))), priceSpecification: { '@type': 'PriceSpecification', priceCurrency: 'INR', price: String(Math.min(minRate('manas'), minRate('kaziranga'))), unitText: 'per vehicle, one way (from)' } } }]
  }));
  add(TAXI, 'weekly', '0.8');

  /* ─────────── sitemap / robots / llms ─────────── */
  const core = [['/', 'weekly', '1.0'], ['/pages/booking.html', 'weekly', '0.9'], ['/pages/itineraries.html', 'weekly', '0.8'], ['/pages/car-rental.html', 'monthly', '0.7'], ['/pages/reviews.html', 'weekly', '0.6']];
  const all = [...core, ...urls];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all.map(([p, f, pr]) => `  <url><loc>${SITE}${p}</loc><lastmod>${TODAY}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`);

  const BOTS = ['Googlebot', 'Bingbot', 'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'Amazonbot', 'DuckDuckBot', 'CCBot', 'cohere-ai', 'Meta-ExternalAgent', 'YouBot', 'MistralAI-User'];
  write('robots.txt', `# ${BRAND} — search engines and AI assistants are welcome to read the public pages.\nUser-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /pages/admin.html\nDisallow: /.netlify/\n\n${BOTS.map(b => `User-agent: ${b}\nAllow: /\nDisallow: /admin\nDisallow: /pages/admin.html\nDisallow: /.netlify/\n`).join('\n')}\nSitemap: ${SITE}/sitemap.xml\n`);

  const kz = park('kaziranga'), mn = park('manas');
  const llmsShort = `# ${BRAND} (Manas Holidays)

> Kaziranga and Manas jungle safari booking, North East India tour packages and airport pickup & drop in Assam, India. Based in Abhayapuri, Assam. Phone / WhatsApp: ${PHONE1_TXT}, ${PHONE2_TXT}.

${BRAND} lets travellers request jeep safaris in Kaziranga National Park and Manas National Park (both UNESCO World Heritage Sites in Assam), book ready-made North East India itineraries, and arrange fixed-fare pickup and drop between Guwahati / Bongaigaon / Barpeta Road and the parks. Safari requests are checked for availability first; a secure payment link is then sent on WhatsApp.

## Main pages
- [Kaziranga jeep safari booking, rates & timings](${SITE}/kaziranga-jungle-safari/): private jeep from ${money(Math.min(...zones.filter(z => z.park_id === 'kaziranga').map(z => z.price_indian)))} per jeep; shared seat ${money(kz.shared_price_per_person)} per person (Indian), ${money(kz.shared_price_foreigner)} (foreigner)
- [Manas National Park jeep safari booking, rates & zones](${SITE}/manas-jungle-safari/): private jeep from ${money(Math.min(...zones.filter(z => z.park_id === 'manas').map(z => z.price_indian)))} per jeep; shared seat ${money(mn.shared_price_per_person)} per person (Indian), ${money(mn.shared_price_foreigner)} (foreigner); Manas camera fees apply
- [North East India tour packages](${SITE}${HUB}): ${its.length} itineraries
- [Guwahati airport to Kaziranga & Manas taxi fares](${SITE}${TAXI}): fixed fares per vehicle, one way
- [Book a safari](${SITE}/pages/booking.html)
- [Car rental and customised routes](${SITE}/pages/car-rental.html)
- [Guest reviews](${SITE}/pages/reviews.html)

## Itineraries
${its.map(it => `- [${it.title}](${SITE}${HUB}${it.slug}/) — ${dur(it)}`).join('\n')}

## Full details
- [Full site content for AI assistants](${SITE}/llms-full.txt)
`;
  write('llms.txt', llmsShort);

  const parkFull = pid => {
    const pk = park(pid), zs = zones.filter(z => z.park_id === pid), ps = slots.filter(s => s.park_id === pid);
    return `## ${PARK_COPY[pid].full} jeep safari (${SITE}${PARK_COPY[pid].path})
- Private jeep, per jeep (Indian / foreigner / max guests): ${zs.map(z => `${z.name} ${money(z.price_indian)} / ${z.price_foreigner != null ? money(z.price_foreigner) : 'Indian only'} / ${z.max_per_jeep}`).join('; ')}
- Shared jeep per person: ${money(pk.shared_price_per_person)} (Indian), ${money(pk.shared_price_foreigner)} (foreigner, includes entry fee); fixed zone: ${(zs.find(z => z.id === pk.shared_zone_id) || {}).name || 'n/a'}
- Time slots: ${ps.map(s => `${s.for_type} ${s.name} ${s.time_range}`).join('; ')}
${pk.camera_still_indian != null ? `- Camera fees per camera: still ${money(pk.camera_still_indian)} (Indian) / ${money(pk.camera_still_foreigner)} (foreigner); video ${money(pk.camera_video_indian)} / ${money(pk.camera_video_foreigner)}\n` : ''}${pk.closed_weekday != null ? `- Closed on ${WEEKDAYS[pk.closed_weekday]}s\n` : ''}- Booking: request online; availability checked; payment link sent on WhatsApp. ID: Aadhaar for Indian guests; passport or other ID for foreign guests.
`;
  };
  write('llms-full.txt', `# ${BRAND} (Manas Holidays) — full details

Business: ${BRAND}, also known as Manas Holidays. Location: Abhayapuri, Assam, India. Phone / WhatsApp: ${PHONE1_TXT}, ${PHONE2_TXT}. Website: ${SITE}.
Services: jeep safari booking (Kaziranga, Manas), North East India tour packages, airport / railway station pickup & drop, car rental. Prices are in Indian rupees (INR). Last updated: ${TODAY}.

${parkFull('kaziranga')}
${parkFull('manas')}
## Pickup & drop fares (one way, per vehicle) (${SITE}${TAXI})
${routes.map(r => { const rs = rates.filter(x => x.route_id === r.id); return rs.length ? `- ${r.city} ⇄ ${r.park_place}: ${rs.map(x => `${x.vehicle_name}${x.seats ? ' ' + x.seats + '-seater' : ''} ${money(x.price)}`).join('; ')}` : ''; }).filter(Boolean).join('\n')}

## North East India itineraries (${SITE}${HUB})
${its.map(it => `### ${it.title} — ${dur(it)}\nURL: ${SITE}${HUB}${it.slug}/\n${it.route ? 'Route: ' + it.route + '\n' : ''}${(Array.isArray(it.days) ? it.days : []).map((d, i) => `Day ${i + 1}: ${d.title}. ${d.text}`).join('\n')}\n`).join('\n')}
`);

  console.log(`Built: ${all.length} URLs in sitemap, ${its.length} itinerary pages, sitemap.xml, robots.txt, llms.txt, llms-full.txt`);
}

main().catch(e => { console.error(e); process.exit(1); });
