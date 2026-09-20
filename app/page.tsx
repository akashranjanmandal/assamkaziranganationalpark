import Link from "next/link";
import { getTrendingItineraries, getApprovedReviews } from "@/lib/supabase/reads";
import { TrendingCarousel } from "@/components/TrendingCarousel";
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel";
import { TOUR_PACKAGES } from "@/lib/tour-packages";

export default async function HomePage() {
  const [trending, reviews] = await Promise.all([
    getTrendingItineraries(),
    getApprovedReviews(6),
  ]);

  return (
    <>
      <header
        className="hero"
        style={{
          minHeight: "100vh",
          background: "var(--forest-black)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="hero-image"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/images/hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.35,
            filter: "grayscale(15%)",
          }}
        />
        <div className="hero-content" style={{ position: "relative", zIndex: 5, textAlign: "center", maxWidth: 1100, padding: "0 2rem" }}>
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--gold)",
              fontWeight: 700,
              marginBottom: "0.8rem",
            }}
          >
            Assam Wild Safari Powered by Manas Holidays
          </div>
          <p
            style={{
              fontSize: "clamp(0.85rem,1.8vw,1.1rem)",
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.06em",
              marginBottom: "0.6rem",
              fontStyle: "italic",
            }}
          >
            Assam — The Land of Rhinos &amp; Zubeen Garg
          </p>
          <h1 className="hero-title" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)", fontFamily: "var(--font-display)", lineHeight: 0.95, color: "var(--pure-white)", marginBottom: "2rem", letterSpacing: "0.02em" }}>
            FOR THE FIRST TIME IN ASSAM
            <br />
            SHARED JEEP BOOKING ONLINE
          </h1>
          <p
            style={{
              fontSize: "clamp(0.95rem,2vw,1.15rem)",
              color: "rgba(255,255,255,0.8)",
              letterSpacing: "0.02em",
              marginBottom: "2rem",
              maxWidth: 800,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Save your jeep safari cost. Book a shared jeep for solo &amp; couple travellers.{" "}
            <strong style={{ color: "var(--gold)" }}>You can also book a jeep on private basis.</strong>
          </p>
          <div className="hero-actions" style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap", alignItems: "stretch" }}>
            <Link
              href="/booking?type=shared"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.3rem",
                padding: "1.1rem 2.2rem",
                minWidth: 220,
                textAlign: "center",
                background: "var(--gold)",
                border: "2px solid var(--gold)",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Book Shared Jeep Safari
              </span>
              <span style={{ fontSize: "0.62rem", opacity: 0.85, fontWeight: 400 }}>
                For Indian Tourists Only · Solo &amp; Couple Travellers
              </span>
            </Link>
            <Link
              href="/itineraries"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.3rem",
                padding: "1.1rem 2.2rem",
                minWidth: 220,
                textAlign: "center",
                background: "transparent",
                border: "2px solid #fff",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Book Northeast Tour Package
              </span>
              <span style={{ fontSize: "0.62rem", opacity: 0.85, fontWeight: 400 }}>Itineraries &amp; Packages</span>
            </Link>
            <Link
              href="/car-rental"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.3rem",
                padding: "1.1rem 2.2rem",
                minWidth: 220,
                textAlign: "center",
                background: "transparent",
                border: "2px solid #fff",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Car Rental
              </span>
              <span style={{ fontSize: "0.62rem", opacity: 0.85, fontWeight: 400 }}>Local &amp; Outstation Vehicles</span>
            </Link>
          </div>
          <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center", gap: "2rem", flexWrap: "wrap" }}>
            <a href="tel:+919365609948" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "0.8rem" }}>
              +91 93656 09948
            </a>
            <a href="tel:+919709884206" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "0.8rem" }}>
              +91 97098 84206
            </a>
            <a href="https://wa.me/919365609948" target="_blank" rel="noopener" style={{ color: "#25d366", textDecoration: "none", fontSize: "0.8rem" }}>
              WhatsApp Us
            </a>
          </div>
          <div
            className="hero-recognised"
            style={{
              marginTop: "2rem",
              background: "rgba(201,163,79,0.1)",
              border: "1px solid rgba(201,163,79,0.35)",
              padding: "1.2rem 2rem",
              display: "inline-block",
              borderRadius: 2,
            }}
          >
            <span className="rec-label" style={{ display: "block", marginBottom: "0.8rem", textAlign: "center" }}>
              Recognised by
            </span>
            <div className="rec-logos" style={{ gap: "2rem", justifyContent: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
                <img src="/images/assam-logo.jpg" alt="Government of Assam" className="rec-logo" />
                <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.5)" }}>Dept. of Tourism, Govt. of Assam</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
                <img src="/images/bodoland.jpg" alt="Bodoland Territorial Council" className="rec-logo" />
                <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.5)" }}>Bodoland Tourism</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="marquee-section">
        <div className="marquee-track">
          {Array.from({ length: 2 }).flatMap((_, dupIdx) =>
            [
              "ONE-HORNED RHINOCEROS",
              "BENGAL TIGER",
              "GOLDEN LANGUR",
              "WILD WATER BUFFALO",
              "ASIAN ELEPHANT",
              "PYGMY HOG",
            ].map((text, i) => (
              <span className="marquee-text" key={`${dupIdx}-${i}`}>
                {text}
              </span>
            ))
          )}
        </div>
      </div>

      <section className="stats-strip">
        <div className="stats-inner">
          <div className="stat-item reveal">
            <div className="stat-number" data-count="3200" data-suffix="+">0</div>
            <div className="stat-label">Explorers Served</div>
          </div>
          <div className="stat-item reveal" data-delay="100">
            <div className="stat-number" data-count="98" data-suffix="%">0</div>
            <div className="stat-label">Sighting Record</div>
          </div>
          <div className="stat-item reveal" data-delay="200">
            <div className="stat-number" data-count="15" data-suffix="">0</div>
            <div className="stat-label">Elite Experts</div>
          </div>
          <div className="stat-item reveal" data-delay="300">
            <div className="stat-number" data-count="99" data-suffix="%">0</div>
            <div className="stat-label">Mission Success</div>
          </div>
        </div>
      </section>

      <section className="intro-section" style={{ background: "var(--pure-white)" }}>
        <div
          className="intro-grid"
          style={{ maxWidth: 1300, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "8rem", alignItems: "center" }}
        >
          <div className="reveal-left">
            <span className="section-label">Operational Intel</span>
            <h2 className="section-title">WE DON&apos;T JUST TOUR. WE DEPLOY.</h2>
            <p className="section-body" style={{ marginBottom: "3rem" }}>
              While others take you on a casual drive, we execute a tactical mission. Our naturalists are tracking
              experts, trained to read the forest&apos;s every signal. In Kaziranga and Manas, we own the terrain.
            </p>
            <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem" }}>
              <div className="feature-item" style={{ borderLeft: "4px solid var(--gold)", paddingLeft: "2rem" }}>
                <h4 style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Elite Trackers
                </h4>
                <p style={{ fontSize: "0.92rem", color: "var(--forest-mid)" }}>
                  15+ years of pure tactical field expertise in Assam&apos;s national parks.
                </p>
              </div>
              <div className="feature-item" style={{ borderLeft: "4px solid var(--gold)", paddingLeft: "2rem" }}>
                <h4 style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Max Sightings
                </h4>
                <p style={{ fontSize: "0.92rem", color: "var(--forest-mid)" }}>
                  Optimized deployment windows for maximum wildlife encounter probability.
                </p>
              </div>
            </div>
          </div>
          <div className="intro-img-wrap reveal-right" style={{ position: "relative", paddingBottom: "3rem" }}>
            <div
              className="intro-img-main"
              style={{ width: "100%", height: 600, background: "url('/images/about-bg.jpg') center/cover", boxShadow: "var(--shadow-premium)" }}
            />
            <div
              className="intro-img-secondary"
              style={{
                position: "absolute",
                bottom: 0,
                left: "-3.5rem",
                width: "60%",
                height: 350,
                background:
                  "url('https://images.unsplash.com/photo-1561731216-c3a4d99437d5?q=80&w=1964&auto=format&fit=crop') center/cover",
                border: "10px solid var(--pure-white)",
                boxShadow: "var(--shadow-premium)",
              }}
            />
          </div>
        </div>
      </section>

      <TrendingCarousel items={trending} />

      <section className="ne-section">
        <div style={{ textAlign: "center", marginBottom: "5rem" }}>
          <span className="section-label">Beyond the Horizon</span>
          <h2 className="section-title">Northeast Tour Packages</h2>
          <p style={{ color: "var(--forest-mid)", maxWidth: 700, margin: "0 auto", fontSize: "1.1rem" }}>
            Venture deep into the uncharted territories of the North-East. From the peaks of Tawang to the hidden
            valleys of Bhutan.
          </p>
        </div>

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
                  Enquire Now
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="ne-services-row">
          <div className="ne-service-card reveal">
            <div className="ne-service-icon">🚗</div>
            <h4>Car Rental</h4>
            <p>Premium SUV and 4x4 for all terrains across North-East India. Professional drivers with local knowledge.</p>
            <Link href="/car-rental" className="btn-ghost" style={{ padding: "0.7rem 1.4rem", fontSize: "0.7rem", marginTop: "1.5rem" }}>
              Book Vehicle
            </Link>
          </div>
          <div className="ne-service-card reveal" data-delay="150">
            <div className="ne-service-icon">🏨</div>
            <h4>Hotel Booking</h4>
            <p>Verified eco-resorts and comfortable stays near all core wildlife zones across the North-East.</p>
            <a
              href="https://wa.me/919365609948?text=I'd%20like%20to%20enquire%20about%20hotel%20booking"
              target="_blank"
              rel="noopener"
              className="btn-ghost"
              style={{ padding: "0.7rem 1.4rem", fontSize: "0.7rem", marginTop: "1.5rem" }}
            >
              Reserve Stay
            </a>
          </div>
        </div>

        <div className="ne-policy-box reveal">
          <div className="ne-policy-title">Refund &amp; Cancellation Policy — Jeep Safari</div>
          <p className="ne-policy-text" style={{ marginBottom: "1rem" }}>
            For any circumstances if the National Park authority does not allow entry,{" "}
            <strong>full payment will be refunded within 24 hours</strong>. No cancellation charges.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem", marginTop: "1.2rem" }}>
            <div style={{ background: "rgba(201,163,79,0.08)", border: "1px solid rgba(201,163,79,0.3)", padding: "1rem 1.2rem", borderRadius: 2, textAlign: "center" }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#b7861a" }}>100%</div>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#742a2a", marginTop: "0.3rem" }}>
                Refund if cancelled
                <br />
                <strong>8+ days</strong> before safari
              </div>
            </div>
            <div style={{ background: "rgba(201,163,79,0.08)", border: "1px solid rgba(201,163,79,0.3)", padding: "1rem 1.2rem", borderRadius: 2, textAlign: "center" }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#b7861a" }}>70%</div>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#742a2a", marginTop: "0.3rem" }}>
                Refund if cancelled
                <br />
                <strong>7 days</strong> before safari
              </div>
            </div>
            <div style={{ background: "rgba(229,62,62,0.06)", border: "1px solid rgba(229,62,62,0.25)", padding: "1rem 1.2rem", borderRadius: 2, textAlign: "center" }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#e53e3e" }}>0%</div>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#742a2a", marginTop: "0.3rem" }}>
                No refund if cancelled
                <br />
                within <strong>3 days</strong> of safari
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sector-section" style={{ background: "var(--off-white)" }}>
        <div style={{ textAlign: "center", marginBottom: "6rem" }}>
          <span className="section-label">Sector Assignment</span>
          <h2 className="section-title">Choose your National Park</h2>
        </div>
        <div className="sector-grid" style={{ maxWidth: 1300, margin: "4rem auto 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }}>
          <div className="park-card reveal" style={{ background: "var(--pure-white)", boxShadow: "var(--shadow-premium)" }}>
            <div className="park-card-img" style={{ height: 400, backgroundSize: "cover", backgroundPosition: "center", backgroundImage: "url('/images/kaziranga.jpg')" }} />
            <div className="park-card-body" style={{ padding: "3.5rem" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "2.8rem", color: "var(--forest-black)", marginBottom: "1.2rem" }}>
                KAZIRANGA
              </h3>
              <p style={{ color: "var(--forest-mid)", lineHeight: 1.8, marginBottom: "2rem" }}>
                The ultimate stronghold of the One-Horned Rhinoceros. A vast, unforgiving landscape where nature
                rules with absolute authority — home to the world&apos;s largest rhino population.
              </p>
              <div className="park-card-tags" style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
                <span className="park-tag">Big 5 Sector</span>
                <span className="park-tag">UNESCO Heritage</span>
              </div>
              <div style={{ marginBottom: "1.8rem", padding: "1rem 1.2rem", background: "var(--off-white,#f7f5f0)", borderLeft: "3px solid var(--gold)" }}>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.6rem" }}>
                  Jeep Safari Rates
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--forest-dark)", lineHeight: 1.9 }}>
                  <strong>Shared Jeep</strong> — ₹1,000 / person <span style={{ fontSize: "0.72rem", color: "#888" }}>(Solo &amp; Couple)</span>
                  <br />
                  <strong>Private Jeep</strong> — ₹3,500 / jeep <span style={{ fontSize: "0.72rem", color: "#888" }}>(Above 3 persons · max 6 people)</span>
                </div>
              </div>
              <Link href="/booking" className="btn-primary" style={{ fontSize: "0.75rem", padding: "1rem 2.5rem" }}>
                Engage Sector
              </Link>
            </div>
          </div>
          <div className="park-card reveal" data-delay="100" style={{ background: "var(--pure-white)", boxShadow: "var(--shadow-premium)" }}>
            <div className="park-card-img" style={{ height: 400, backgroundSize: "cover", backgroundPosition: "center", backgroundImage: "url('/images/manas-guideliness.jpg')" }} />
            <div className="park-card-body" style={{ padding: "3.5rem" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "2.8rem", color: "var(--forest-black)", marginBottom: "1.2rem" }}>
                MANAS
              </h3>
              <p style={{ color: "var(--forest-mid)", lineHeight: 1.8, marginBottom: "2rem" }}>
                Hidden within the Himalayan foothills, a biosphere reserve of legendary status. The last refuge of
                the Golden Langur and Pygmy Hog. Only for the true wildlife operative.
              </p>
              <div className="park-card-tags" style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
                <span className="park-tag">Elusive Species</span>
                <span className="park-tag">Himalayan Core</span>
              </div>
              <div style={{ marginBottom: "1.8rem", padding: "1rem 1.2rem", background: "var(--off-white,#f7f5f0)", borderLeft: "3px solid var(--gold)" }}>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.6rem" }}>
                  Jeep Safari Rates
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--forest-dark)", lineHeight: 1.9 }}>
                  <strong>Shared Jeep</strong> — ₹1,300 / person <span style={{ fontSize: "0.72rem", color: "#888" }}>(Solo &amp; Couple)</span>
                  <br />
                  <strong>Private Jeep</strong> — ₹4,500 / jeep <span style={{ fontSize: "0.72rem", color: "#888" }}>(Above 3 persons · max 6 people)</span>
                </div>
              </div>
              <Link href="/booking" className="btn-primary" style={{ fontSize: "0.75rem", padding: "1rem 2.5rem" }}>
                Engage Sector
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section" style={{ background: "var(--forest-black)", color: "var(--pure-white)", textAlign: "center" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <span className="section-label">Final Briefing</span>
          <h2 className="section-title" style={{ color: "var(--pure-white)" }}>
            NO COMPROMISE.
            <br />
            ONLY ADVENTURE.
          </h2>
          <p style={{ fontSize: "1.15rem", opacity: 0.6, marginBottom: "5rem", maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            We didn&apos;t build Assam Wild Safari to be another travel agency. We built it to provide the most
            intense, authentic wildlife experiences on the planet.
          </p>
          <div className="cta-features" style={{ display: "flex", justifyContent: "center", gap: "5rem", flexWrap: "wrap", marginBottom: "6rem" }}>
            <div className="cta-feature reveal" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
              <span style={{ fontSize: "0.75rem", letterSpacing: "0.2em", fontWeight: 700 }}>Verified Elite</span>
            </div>
            <div className="cta-feature reveal" data-delay="100" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
              <span style={{ fontSize: "0.75rem", letterSpacing: "0.2em", fontWeight: 700 }}>Immediate Deploy</span>
            </div>
            <div className="cta-feature reveal" data-delay="200" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
              <span style={{ fontSize: "0.75rem", letterSpacing: "0.2em", fontWeight: 700 }}>Precision Recon</span>
            </div>
          </div>
          <div style={{ marginTop: "5rem" }}>
            <Link href="/booking" className="btn-primary" style={{ padding: "1.5rem 4rem" }}>
              Authorize Mission Now
            </Link>
          </div>
        </div>
      </section>

      <TestimonialsCarousel reviews={reviews} />
    </>
  );
}
