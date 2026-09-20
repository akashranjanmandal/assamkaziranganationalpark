"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";

interface Review {
  id: number;
  name: string;
  rating: number;
  message: string;
  park: string | null;
  approved: boolean;
  created_at: string;
}

export default function AdminReviewsPage() {
  const showToast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reviews");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load reviews");
      setReviews(json.reviews ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load reviews", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "pending") return reviews.filter((r) => !r.approved);
    if (filter === "approved") return reviews.filter((r) => r.approved);
    return reviews;
  }, [reviews, filter]);

  async function setApproved(id: number, approved: boolean) {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      showToast(approved ? "Review approved!" : "Review unapproved.", "success");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Update failed", "error");
    }
  }

  async function deleteReview(id: number) {
    if (!confirm("Delete this review? Cannot undo.")) return;
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      showToast("Review deleted.", "success");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.2rem", flexWrap: "wrap" }}>
        <select
          className="form-input"
          style={{ padding: "0.6rem 0.9rem", width: "auto" }}
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">All Reviews</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
        </select>
        <button className="admin-btn admin-btn-ghost" onClick={load}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="admin-empty">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">No reviews found.</div>
      ) : (
        filtered.map((r) => (
          <div
            key={r.id}
            style={{
              background: "#fff",
              padding: "1.3rem",
              marginBottom: "0.8rem",
              borderLeft: `4px solid ${r.approved ? "#1a5c2a" : "#e5e5e5"}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "0.7rem" }}>
              <div>
                <div style={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ color: "var(--gold)", opacity: i >= r.rating ? 0.18 : 1 }}>★</span>
                  ))}
                </div>
                <span style={{ fontWeight: 700 }}>{r.name}</span> ·{" "}
                <span style={{ fontSize: "0.8rem", color: "var(--forest-mid)" }}>{r.park || "—"}</span>
                <span style={{ fontSize: "0.72rem", color: "#aaa", marginLeft: "0.4rem" }}>
                  {new Date(r.created_at).toLocaleDateString("en-IN")}
                </span>
                <span className={`badge ${r.approved ? "badge-confirmed" : "badge-pending"}`} style={{ marginLeft: "0.4rem" }}>
                  {r.approved ? "Approved" : "Pending"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {!r.approved ? (
                  <button className="admin-btn admin-btn-primary" onClick={() => setApproved(r.id, true)}>
                    Approve
                  </button>
                ) : (
                  <button className="admin-btn admin-btn-ghost" onClick={() => setApproved(r.id, false)}>
                    Unapprove
                  </button>
                )}
                <button className="admin-btn admin-btn-danger" onClick={() => deleteReview(r.id)}>
                  Delete
                </button>
              </div>
            </div>
            <p style={{ fontSize: "0.88rem", color: "#333", lineHeight: 1.7 }}>&quot;{r.message}&quot;</p>
          </div>
        ))
      )}
    </div>
  );
}
