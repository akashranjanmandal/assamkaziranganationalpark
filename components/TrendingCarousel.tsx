"use client";

import { useRef, useState } from "react";
import { wireCarouselArrows } from "@/hooks/useScrollReveal";
import type { TrendingItinerary } from "@/lib/supabase/reads";

export function TrendingCarousel({ items }: { items: TrendingItinerary[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setupArrows(node: HTMLDivElement | null) {
    trackRef.current = node;
    if (node && prevRef.current && nextRef.current) {
      wireCarouselArrows(node, prevRef.current, nextRef.current);
    }
  }

  if (!items.length) return null;

  return (
    <section className="trending-section" id="trending-section">
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <span className="section-label">Hot Right Now</span>
        <h2 className="section-title">TRENDING ITINERARIES</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", maxWidth: 600, margin: "0 auto", fontSize: "1rem" }}>
          Handpicked by our field operators — the most sought-after routes this season.
        </p>
      </div>
      <div className="carousel-wrap">
        <button ref={prevRef} className="carousel-arrow prev" aria-label="Previous">
          ‹
        </button>
        <div className="trending-scroll" ref={setupArrows}>
          {items.map((t) => (
            <div className="trending-card" key={t.id}>
              {t.duration && <div className="trending-card-badge">{t.duration}</div>}
              <div className="trending-card-title">{t.title}</div>
              {t.short_desc && <div className="trending-card-days">{t.short_desc}</div>}
              {t.price_from && <div className="trending-card-price">{t.price_from}</div>}
              {t.details && (
                <>
                  <button className="td-toggle" onClick={() => toggle(t.id)}>
                    {openIds.has(t.id) ? "▲ Hide Itinerary" : "▼ View Day-by-Day"}
                  </button>
                  <div
                    className={`td-details${openIds.has(t.id) ? " open" : ""}`}
                    dangerouslySetInnerHTML={{ __html: t.details }}
                  />
                </>
              )}
              <a
                href={`https://wa.me/919365609948?text=${encodeURIComponent(
                  `I'm interested in ${t.title}`
                )}`}
                target="_blank"
                rel="noopener"
                className="trending-enquire"
              >
                Enquire Now
              </a>
            </div>
          ))}
        </div>
        <button ref={nextRef} className="carousel-arrow next" aria-label="Next">
          ›
        </button>
      </div>
    </section>
  );
}
