import { getApprovedReviews } from "@/lib/supabase/reads";
import { ReviewForm } from "@/components/ReviewForm";

export default async function ReviewsPage() {
  const reviews = await getApprovedReviews();

  return (
    <>
      <section style={{ paddingTop: "10rem", textAlign: "center" }}>
        <span className="section-label">Field Reports</span>
        <h1 className="section-title">TRAVELLER REVIEWS</h1>
        <p style={{ color: "var(--forest-mid)", maxWidth: 700, margin: "0 auto", fontSize: "1.05rem" }}>
          Real experiences from guests who joined our Kaziranga &amp; Manas expeditions.
        </p>
      </section>

      <section>
        {reviews.length > 0 ? (
          <div className="reviews-container">
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
                  <div>
                    <div className="review-user">{r.name.toUpperCase()}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--forest-mid)", marginTop: "0.3rem" }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="review-park-tag">{r.park || ""}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "var(--forest-mid)" }}>
            No reviews yet — be the first to share your experience!
          </p>
        )}
      </section>

      <section style={{ background: "var(--off-white)" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span className="section-label">Share Your Experience</span>
          <h2 className="section-title">WRITE A REVIEW</h2>
        </div>
        <ReviewForm />
      </section>
    </>
  );
}
