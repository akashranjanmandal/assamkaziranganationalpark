"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { TrendingCarousel } from "@/components/TrendingCarousel";
import { TOUR_PACKAGES } from "@/lib/tour-packages";
import type { TrendingItinerary } from "@/lib/supabase/reads";

export function ItinerariesContent({ trending }: { trending: TrendingItinerary[] }) {
  const t = useTranslation();

  return (
    <>
      <section style={{ paddingTop: "10rem", textAlign: "center" }}>
        <span className="section-label">{t("itin_eyebrow")}</span>
        <h1 className="section-title" dangerouslySetInnerHTML={{ __html: t("itin_h1") }} />
        <p style={{ color: "var(--forest-mid)", maxWidth: 700, margin: "0 auto", fontSize: "1.05rem" }}>
          {t("itin_sub")}
        </p>
      </section>

      <TrendingCarousel items={trending} />

      <section id="kaziranga">
        <div className="tour-cards-grid">
          {TOUR_PACKAGES.map((pkg) => (
            <div className="tour-card reveal" key={pkg.title}>
              <div className="tour-card-header">
                <div className="tour-card-badge">{pkg.badge}</div>
                <h3 className="tour-card-title">{pkg.title}</h3>
                <div className="tour-card-duration">{pkg.duration}</div>
                {pkg.route && <div className="tour-card-route">{pkg.route}</div>}
                {pkg.price && (
                  <div className="tour-card-price">
                    {pkg.price} <span>/ person</span>
                    {pkg.priceNote && <em>{pkg.priceNote}</em>}
                  </div>
                )}
              </div>
              <div className="tour-card-body">
                <div className="day-list">
                  {pkg.days.map((d) => (
                    <div className="day-item" key={d.num}>
                      <div className="day-num">{d.num}</div>
                      <div className="day-desc" dangerouslySetInnerHTML={{ __html: d.desc }} />
                    </div>
                  ))}
                </div>
                {pkg.includes && (
                  <div className="tour-includes">
                    <div className="inc-title">Included</div>
                    <div className="inc-tags">
                      {pkg.includes.map((inc) => (
                        <span key={inc}>{inc}</span>
                      ))}
                    </div>
                    {pkg.note && <div className="inc-note">{pkg.note}</div>}
                  </div>
                )}
              </div>
              <div className="tour-card-footer">
                <a
                  href={`https://wa.me/919365609948?text=${encodeURIComponent(`I'm interested in the ${pkg.title} package`)}`}
                  target="_blank"
                  rel="noopener"
                  className="tour-enquire-btn"
                >
                  {t("btn_enquire")}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="manas" style={{ background: "var(--forest-black)", color: "var(--pure-white)", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <span className="section-label">Ready to Deploy?</span>
          <h2 className="section-title" style={{ color: "var(--pure-white)" }}>
            BOOK YOUR SAFARI TODAY
          </h2>
          <Link href="/booking" className="btn-primary" style={{ padding: "1.2rem 3rem" }}>
            {t("nav_book_safari")}
          </Link>
        </div>
      </section>
    </>
  );
}
