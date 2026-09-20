"use client";

import { useEffect } from "react";

/**
 * Ports reference-js/main.js's initCursor/initNavbar/initHamburger/
 * initReveal/initCounters behavior into React. Runs once on mount and wires
 * up DOM-level effects that apply across the whole page (cursor, navbar
 * scroll state, hamburger drawer, scroll-reveal animations, counters).
 */
export function useGlobalUiEffects() {
  useEffect(() => {
    // Custom cursor (desktop / fine pointer only, matches CSS media query)
    const dot = document.querySelector<HTMLElement>(".cursor-dot");
    const ring = document.querySelector<HTMLElement>(".cursor-ring");
    let raf = 0;
    let mouseX = 0,
      mouseY = 0,
      ringX = 0,
      ringY = 0;
    function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (dot) {
        dot.style.left = mouseX + "px";
        dot.style.top = mouseY + "px";
      }
    }
    function animateRing() {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      if (ring) {
        ring.style.left = ringX + "px";
        ring.style.top = ringY + "px";
      }
      raf = requestAnimationFrame(animateRing);
    }
    if (dot && ring) {
      document.addEventListener("mousemove", onMouseMove);
      raf = requestAnimationFrame(animateRing);
    }

    function onEnter() {
      ring?.classList.add("hovered");
    }
    function onLeave() {
      ring?.classList.remove("hovered");
    }
    const hoverables = document.querySelectorAll("a, button, .park-option, .time-slot");
    hoverables.forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    // Navbar scrolled state
    const navbar = document.querySelector(".navbar");
    function updateNavbar() {
      navbar?.classList.toggle("scrolled", window.scrollY > 60);
    }
    updateNavbar();
    window.addEventListener("scroll", updateNavbar, { passive: true });

    // Scroll reveal
    const revealEls = document.querySelectorAll(".reveal, .reveal-left, .reveal-right");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = parseInt((entry.target as HTMLElement).dataset.delay || "0", 10);
            setTimeout(() => entry.target.classList.add("visible"), delay);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));

    // Counters
    const counterIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const target = parseFloat(el.dataset.count || "0");
            const suffix = el.dataset.suffix || "";
            animateCounter(el, target, suffix);
            counterIo.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    document.querySelectorAll<HTMLElement>("[data-count]").forEach((c) => counterIo.observe(c));

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(raf);
      hoverables.forEach((el) => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      });
      window.removeEventListener("scroll", updateNavbar);
      io.disconnect();
      counterIo.disconnect();
    };
  }, []);
}

function animateCounter(el: HTMLElement, target: number, suffix: string) {
  const isDecimal = String(target).includes(".");
  const duration = 2000;
  const start = performance.now();
  function update(now: number) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = eased * target;
    el.textContent = (isDecimal ? val.toFixed(1) : Math.round(val).toLocaleString()) + suffix;
    if (p < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/** Wires a pair of prev/next buttons to scroll a track by one card-width. */
export function wireCarouselArrows(
  trackEl: HTMLElement | null,
  prevBtn: HTMLButtonElement | null,
  nextBtn: HTMLButtonElement | null
) {
  if (!trackEl || !prevBtn || !nextBtn) return () => {};
  const scrollAmount = () => (trackEl.firstElementChild?.getBoundingClientRect().width || 320) + 24;
  const updateArrows = () => {
    const max = trackEl.scrollWidth - trackEl.clientWidth - 2;
    prevBtn.disabled = trackEl.scrollLeft <= 0;
    nextBtn.disabled = trackEl.scrollLeft >= max;
  };
  const onPrev = () => trackEl.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
  const onNext = () => trackEl.scrollBy({ left: scrollAmount(), behavior: "smooth" });
  prevBtn.addEventListener("click", onPrev);
  nextBtn.addEventListener("click", onNext);
  trackEl.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);
  updateArrows();
  return () => {
    prevBtn.removeEventListener("click", onPrev);
    nextBtn.removeEventListener("click", onNext);
    trackEl.removeEventListener("scroll", updateArrows);
    window.removeEventListener("resize", updateArrows);
  };
}
