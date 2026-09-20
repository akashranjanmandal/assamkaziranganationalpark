export interface TourDay {
  num: string;
  desc: string;
}

export interface TourPackage {
  badge: string;
  title: string;
  duration: string;
  route?: string;
  price?: string;
  priceNote?: string;
  days: TourDay[];
  includes?: string[];
  note?: string;
}

/** Ported verbatim (content + copy) from reference-index.html's tour-cards-grid. */
export const TOUR_PACKAGES: TourPackage[] = [
  {
    badge: "Cultural & Heritage",
    title: "Kohima & Nagaland Explorer",
    duration: "5 Nights / 6 Days",
    route: "Guwahati → Dimapur → Kohima → Khonoma → Dzükou → Guwahati",
    days: [
      { num: "Day 1", desc: "<strong>Guwahati → Kohima</strong> — Road via NH29 (6–7 hrs) or train to Dimapur + drive. Evening local market walk." },
      { num: "Day 2", desc: "<strong>Kohima Sightseeing</strong> — War Cemetery, Nagaland State Museum, Kohima Cathedral." },
      { num: "Day 3", desc: "<strong>Khonoma Village</strong> (20 km) — India's first green village. Village walk, terrace farming views." },
      { num: "Day 4", desc: "<strong>Dzükou Valley Trek</strong> — Moderate trek through seasonal flowers and rolling green hills." },
      { num: "Day 5", desc: "<strong>Kohima → Dimapur</strong> — Kachari Ruins, local markets." },
      { num: "Day 6", desc: "<strong>Dimapur → Guwahati</strong> — Return by road, train or flight." },
    ],
  },
  {
    badge: "Wildlife + Himalayan",
    title: "Manas & Tawang Expedition",
    duration: "7 Nights / 8 Days",
    route: "Guwahati → Manas → Bomdila → Tawang → Bumla → Dirang → Guwahati",
    days: [
      { num: "Day 1", desc: "<strong>Arrival at Manas</strong> — Pickup from Guwahati airport (180 km) or New Bongaigaon station (90 km)." },
      { num: "Day 2", desc: "<strong>Manas Safaris</strong> — Elephant ride 6 AM. Jeep safari 2–4 PM." },
      { num: "Day 3", desc: "<strong>Manas → Bomdila</strong> — 320 km / 8 hrs." },
      { num: "Day 4", desc: "<strong>Bomdila → Tawang</strong> via Sela Pass (13,700 ft) — 180 km / 6 hrs." },
      { num: "Day 5", desc: "<strong>Bumla Pass</strong> (15,200 ft) + Madhuri Lake." },
      { num: "Day 6", desc: "<strong>Tawang → Dirang</strong> — Monastery, Buddha Statue, Nuranang Falls, Sangti Valley." },
      { num: "Day 7", desc: "<strong>Dirang → Guwahati</strong>" },
      { num: "Day 8", desc: "<strong>Kamakhya Temple</strong> darshan. Airport / station drop." },
    ],
  },
  {
    badge: "Grand Circuit",
    title: "Tawang & Kaziranga Grand Tour",
    duration: "6 Nights / 7 Days",
    route: "Guwahati → Shergaon → Tawang → Bumla → Dirang → Kaziranga → Guwahati",
    days: [
      { num: "Day 1", desc: "<strong>Guwahati → Shergaon / Bomdila</strong> — 300 km via Tezpur, Bhalukpong. Inner Line Permit at Bhalukpong." },
      { num: "Day 2", desc: "<strong>→ Tawang</strong> — Sela Pass (13,700 ft), Jaswant Garh War Memorial." },
      { num: "Day 3", desc: "<strong>Bumla Pass &amp; Tawang</strong> — Bum La Pass, Sangestar Lake, Tawang Monastery." },
      { num: "Day 4", desc: "<strong>Tawang → Dirang</strong> — 140 km. Sangti Valley." },
      { num: "Day 5", desc: "<strong>Dirang → Bhalukpong</strong> — 150 km. Optional hot springs." },
      { num: "Day 6", desc: "<strong>→ Kaziranga NP</strong> — 220 km. Evening tea garden visit." },
      { num: "Day 7", desc: "<strong>Kaziranga Safari → Guwahati</strong> — Morning safari, Kamakhya Temple, airport drop." },
    ],
  },
  {
    badge: "Meghalaya Circuit",
    title: "Shillong, Dawki & Cherrapunji",
    duration: "4 Nights / 5 Days",
    route: "Guwahati → Shillong → Dawki → Mawlynnong → Cherrapunji → Guwahati",
    days: [
      { num: "Day 1", desc: "<strong>Guwahati → Shillong</strong> — Pickup and transfer." },
      { num: "Day 2", desc: "<strong>Shillong Sightseeing</strong> — The Scotland of the East." },
      { num: "Day 3", desc: "<strong>Dawki &amp; Mawlynnong</strong> — Crystal-clear Dawki river, Asia's cleanest village. Transfer to Cherrapunji." },
      { num: "Day 4", desc: "<strong>Cherrapunji Sightseeing</strong> — Waterfalls, living root bridges, caves." },
      { num: "Day 5", desc: "<strong>→ Guwahati</strong> — Evening Brahmaputra river cruise." },
      { num: "Day 6", desc: "<strong>Kamakhya Darshan</strong> — Airport / station drop." },
    ],
  },
  {
    badge: "Wildlife + Bhutan",
    title: "Manas & Bhutan (Panbang)",
    duration: "3 Nights / 4 Days",
    route: "Manas National Park → Panbang (Bhutan) → Manas",
    price: "₹12,000",
    priceNote: "min. 5 persons",
    days: [
      { num: "Day 1", desc: "<strong>Arrival at Manas</strong> — Check-in. Evening leisure &amp; bonfire." },
      { num: "Day 2", desc: "<strong>Jungle Safari → Panbang</strong> — Safari through Manas &amp; Royal Manas. Riverside stay in Bhutan." },
      { num: "Day 3", desc: "<strong>Panbang Sightseeing → Manas</strong> — Twin Waterfalls. Return safari." },
      { num: "Day 4", desc: "<strong>Departure</strong> — Breakfast &amp; check-out." },
    ],
    includes: ["2 Jeep Safaris", "All Meals", "Accommodation", "Bonfire", "Guide", "Bhutan Vehicle"],
    note: "Carry original Voter ID & Aadhaar (required at Bhutan border).",
  },
  {
    badge: "Extended Bhutan Circuit",
    title: "Raimona, Manas & Bhutan Circuit",
    duration: "5 Nights / 6 Days",
    route: "Bongaigaon → Raimona → Gelephu → Manas → Panbang → Bongaigaon",
    days: [
      { num: "Day 1", desc: "<strong>Arrival – Raimona NP</strong> — Pickup from New Bongaigaon Station. Afternoon Jeep Safari." },
      { num: "Day 2", desc: "<strong>Raimona → Gelephu</strong> — 91 km / 2.5 hrs into Bhutan." },
      { num: "Day 3", desc: "<strong>Gelephu Sightseeing → Manas</strong> — Local Gelephu tour, then transfer to Manas." },
      { num: "Day 4", desc: "<strong>Manas Safari → Panbang</strong> — Safari through Manas &amp; Royal Manas. Riverside stay." },
      { num: "Day 5", desc: "<strong>Panbang → Manas</strong> — Twin Waterfalls, Hanging Bridge. Return safari." },
      { num: "Day 6", desc: "<strong>Manas → Kakoijana → Departure</strong> — Optional elephant safari. Golden Langur forest. Bongaigaon drop." },
    ],
    note: "Carry original Voter ID & Aadhaar (required at Bhutan border).",
  },
  {
    badge: "8N / 9D",
    title: "Manas · Kaziranga · Tawang",
    duration: "Assam & Arunachal Pradesh",
    days: [
      { num: "D1", desc: "Arrival Manas — check-in, evening briefing" },
      { num: "D2", desc: "Elephant ride + Jeep safari, Manas National Park" },
      { num: "D3", desc: "Manas → Bomdila (scenic drive)" },
      { num: "D4", desc: "Bomdila → Tawang via Sela Pass (13,700 ft)" },
      { num: "D5", desc: "Bumla Pass + Madhuri Lake excursion" },
      { num: "D6", desc: "Tawang → Dirang — monastery, Nuranang Falls, Sangti Valley" },
      { num: "D7", desc: "Dirang → Kaziranga (260 km)" },
      { num: "D8", desc: "Elephant ride + Jeep safari → transfer to Guwahati" },
      { num: "D9", desc: "Kamakhya Temple darshan + airport drop" },
    ],
  },
  {
    badge: "6N / 7D",
    title: "Shillong · Dawki · Cherrapunji · Manas",
    duration: "Assam & Meghalaya",
    days: [
      { num: "D1", desc: "Guwahati → Shillong — check-in" },
      { num: "D2", desc: "Shillong sightseeing — Ward's Lake, Cathedral, Don Bosco Museum" },
      { num: "D3", desc: "Dawki (crystal-clear Umngot River) + Mawlynnong → Cherrapunji" },
      { num: "D4", desc: "Cherrapunji — Nohkalikai Falls, Seven Sisters Falls, Double Decker Root Bridge" },
      { num: "D5", desc: "Cherrapunji → Manas (277 km / ~6.5 hrs)" },
      { num: "D6", desc: "Elephant ride + Jeep safari → transfer to Guwahati" },
      { num: "D7", desc: "Kamakhya Temple + airport/station drop" },
    ],
  },
  {
    badge: "2N / 3D",
    title: "Manas National Park",
    duration: "Bodoland, Assam",
    days: [
      { num: "D1", desc: "Pickup — Guwahati (200 km) / Barpeta Road (20 km) / New Bongaigaon (80 km) → check-in Manas" },
      { num: "D2", desc: "6 AM Elephant ride + Jeep safari (morning) · Afternoon Jeep safari" },
      { num: "D3", desc: "Drop at airport/station — en-route visit Kakoijana Reserve Forest (Golden Langur)" },
    ],
  },
  {
    badge: "5N / 6D",
    title: "Majuli · Gibbon Century · Kaziranga",
    duration: "Upper Assam",
    days: [
      { num: "D1", desc: "Receive at Jorhat Airport / Mariani Junction → Gibbon Wildlife Sanctuary → overnight Jorhat" },
      { num: "D2", desc: "Jorhat → Majuli by ferry (world's largest river island)" },
      { num: "D3", desc: "Majuli — Chamuguri Satra, Kamalabari, Dakhinpat, Auniati Satra, Mising tribe village &amp; culture" },
      { num: "D4", desc: "Majuli → Kaziranga National Park" },
      { num: "D5", desc: "Afternoon Jeep safari — Rhinos, Elephants, Wild Buffalo" },
      { num: "D6", desc: "Morning elephant ride + drop at Jorhat Airport or Guwahati station" },
    ],
  },
];
