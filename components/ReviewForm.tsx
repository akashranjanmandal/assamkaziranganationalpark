"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";

export function ReviewForm() {
  const showToast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [park, setPark] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      showToast("Please fill in your name and review.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), rating, message: message.trim(), park: park || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit review");
      }
      showToast("Thank you! Your review will appear once approved.", "success");
      setName("");
      setRating(5);
      setMessage("");
      setPark("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to submit review", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="form-group">
        <label className="form-label">Your Name</label>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Rating</label>
        <select className="form-input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} Star{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Park Visited (optional)</label>
        <select className="form-input" value={park} onChange={(e) => setPark(e.target.value)}>
          <option value="">—</option>
          <option value="Kaziranga">Kaziranga</option>
          <option value="Manas">Manas</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Your Review</label>
        <textarea className="form-input" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <button className="btn-primary" style={{ width: "100%" }} type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  );
}
