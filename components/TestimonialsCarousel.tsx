"use client";

import Link from "next/link";
import { useRef } from "react";
import { wireCarouselArrows } from "@/hooks/useScrollReveal";
import type { Review } from "@/lib/supabase/reads";

export function TestimonialsCarousel({ reviews }: { reviews: Review[] }) {
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  function setupArrows(node: HTMLDivElement | null) {
    if (node && prevRef.current && nextRef.current) {
      wireCarouselArrows(node, prevRef.current, nextRef.current);
    }
  }

  if (!reviews.length) return null;

  return (
    <section id="home-testimonials-section" style={{ background: "var(--off-white)", padding: "8rem 2rem" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "5rem" }}>
          <span className="section-label">Traveller Voices</span>
          <h2 className="section-title">WHAT OUR GUESTS SAY</h2>
        </div>
        <div className="carousel-wrap">
          <button ref={prevRef} className="carousel-arrow prev" aria-label="Previous">
            ‹
          </button>
          <div className="carousel-track home-reviews-container" ref={setupArrows}>
            {reviews.map((r) => (
              <div className="review-card" key={r.id}>
                <div className="review-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ color: "var(--gold)", opacity: i >= r.rating ? 0.15 : 1 }}>
                      ★
                    </span>
                  ))}
                </div>
                <p className="review-text">&quot;{r.message}&quot;</p>
                <div className="review-meta">
                  <div className="review-user">{(r.name || "").toUpperCase()}</div>
                  <div className="review-park-tag">{r.park || ""}</div>
                </div>
              </div>
            ))}
          </div>
          <button ref={nextRef} className="carousel-arrow next" aria-label="Next">
            ›
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: "4rem" }}>
          <Link href="/reviews" className="btn-primary" style={{ padding: "1rem 2.5rem" }}>
            Read More Reviews
          </Link>
        </div>
      </div>
    </section>
  );
}
