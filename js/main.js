function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  const update = () => navbar.classList.toggle('scrolled', window.scrollY > 60);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

function initHamburger() {
  const ham = document.querySelector('.hamburger');
  const links = document.querySelector('.nav-links');
  if (!ham || !links) return;
  let overlay = document.querySelector('.nav-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);
  }
  const openMenu = () => {
    links.classList.add('open');
    ham.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  };
  const closeMenu = () => {
    links.classList.remove('open');
    ham.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  };
  ham.addEventListener('click', () => links.classList.contains('open') ? closeMenu() : openMenu());
  overlay.addEventListener('click', closeMenu);
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  const closeBtn = document.getElementById('nav-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
}

function initReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), parseInt(e.target.dataset.delay || 0));
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  els.forEach(el => io.observe(el));
}

function animateCounter(el, target, suffix) {
  const isDecimal = String(target).includes('.');
  const duration = 2000;
  const start = performance.now();
  (function update(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = eased * target;
    el.textContent = (isDecimal ? val.toFixed(1) : Math.round(val).toLocaleString()) + suffix;
    if (p < 1) requestAnimationFrame(update);
  })(performance.now());
}

function initCounters() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target, parseFloat(e.target.dataset.count), e.target.dataset.suffix || '');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(c => io.observe(c));
}

function initPageTransitions() {
  const pt = document.querySelector('.page-transition');
  if (!pt) return;
  setTimeout(() => { pt.classList.add('loaded'); }, 100);
  document.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('tel') || href.includes('://') || href === 'javascript:void(0)') return;
    link.addEventListener('click', e => {
      e.preventDefault();
      pt.classList.remove('loaded');
      pt.classList.add('active');
      setTimeout(() => { window.location.href = href; }, 800);
    });
  });
  window.addEventListener('pageshow', e => { if (e.persisted) { pt.classList.remove('active'); pt.classList.add('loaded'); } });
}

/* BOOKING — the new booking.html self-initialises; this is a no-op guard */
function initBooking() { /* booking page handles its own state */ }

/* REVIEWS */
/* Escape text from the database before putting it into innerHTML.
   Review text is written by the public, so it must never be rendered as HTML. */
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderReviews(reviews) {
  const container = document.querySelector('.reviews-container');
  if (!container) return;
  container.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-stars">${Array(5).fill(0).map((_, i) => `<i data-lucide="star" style="width:18px;height:18px;color:var(--gold);${i >= r.rating ? 'opacity:0.15' : ''}"></i>`).join('')}</div>
      <p class="review-text">"${escapeHtml(r.message)}"</p>
      <div class="review-meta">
        <div><div class="review-user">${escapeHtml(String(r.name || '').toUpperCase())}</div><div style="font-size:0.75rem;color:var(--forest-mid);margin-top:0.3rem;">${escapeHtml(r.date)}</div></div>
        <div class="review-park-tag">${escapeHtml(r.park)}</div>
      </div>
    </div>`).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/* initReviews/submitReview intentionally omitted here — reviews.html wires
   these up itself against the real Supabase 'reviews' table. */
function initReviews() {}

/* CAROUSEL ARROWS — wires a pair of prev/next buttons to scroll a track
   by one card-width, hiding the visible scrollbar (still touch/drag-scrollable). */
function wireCarouselArrows(trackEl, prevBtn, nextBtn) {
  if (!trackEl || !prevBtn || !nextBtn) return;
  const scrollAmount = () => (trackEl.firstElementChild?.getBoundingClientRect().width || 320) + 24;
  const updateArrows = () => {
    const max = trackEl.scrollWidth - trackEl.clientWidth - 2;
    prevBtn.disabled = trackEl.scrollLeft <= 0;
    nextBtn.disabled = trackEl.scrollLeft >= max;
  };
  prevBtn.addEventListener('click', () => trackEl.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
  nextBtn.addEventListener('click', () => trackEl.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));
  trackEl.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`; t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    t.classList.add('visible');
    setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 400); }, 4000);
  }));
}

function init() { initNavbar(); initHamburger(); initReveal();
  initCounters(); initPageTransitions(); initBooking(); initReviews();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
document.addEventListener('DOMContentLoaded', init);
