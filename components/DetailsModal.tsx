"use client";

import { useEffect } from "react";
import { ParkKey, getParkRules, PARK_INFO } from "@/lib/booking-data";

/**
 * Ported from reference-pages/booking.html's #details-modal — the "See
 * Details" bottom sheet covering jeep pricing for both parks, the
 * cancellation policy, and (when a park is selected) that park's specific
 * rules. Purely informational; doesn't affect the booking state machine.
 */
export function DetailsModal({
  open,
  onClose,
  park,
}: {
  open: boolean;
  onClose: () => void;
  park: ParkKey | "";
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const rules = park ? getParkRules(park) : [];

  return (
    <div className="details-modal open" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="details-modal-backdrop" onClick={onClose} />
      <div className="details-modal-sheet">
        <div className="modal-handle-bar" />
        <div className="modal-header">
          <div className="modal-title" id="modal-title">
            Safari Details
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close details">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {/* Pricing */}
          <div className="modal-section">
            <div className="modal-section-label">₹ Jeep Safari Pricing</div>
            <div className="modal-pricing-grid">
              <div>
                <div className="modal-pricing-col-title">📍 {PARK_INFO.kaziranga.label}</div>
                <div className="modal-price-row">
                  <div className="modal-price-type">Shared Jeep</div>
                  <div className="modal-price-amount">
                    ₹{PARK_INFO.kaziranga.price.toLocaleString()} <span className="modal-price-unit">/ person</span>
                  </div>
                </div>
                <div className="modal-price-row" style={{ background: "rgba(201,163,79,0.08)" }}>
                  <div className="modal-price-type">Private Jeep (3–6 people)</div>
                  <div className="modal-price-amount gold">
                    ₹{PARK_INFO.kaziranga.jeepPrice.toLocaleString()} <span className="modal-price-unit">/ jeep</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="modal-pricing-col-title">📍 {PARK_INFO.manas.label}</div>
                <div className="modal-price-row">
                  <div className="modal-price-type">Shared Jeep</div>
                  <div className="modal-price-amount">
                    ₹{PARK_INFO.manas.price.toLocaleString()} <span className="modal-price-unit">/ person</span>
                  </div>
                </div>
                <div className="modal-price-row" style={{ background: "rgba(201,163,79,0.08)" }}>
                  <div className="modal-price-type">Private Jeep (3–6 people)</div>
                  <div className="modal-price-amount gold">
                    ₹{PARK_INFO.manas.jeepPrice.toLocaleString()} <span className="modal-price-unit">/ jeep</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-price-note" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", flexWrap: "wrap" }}>
              ✓ All entry fees included &nbsp;·&nbsp;
              <span style={{ color: "#c0392b" }}>Camera charges extra</span> &nbsp;·&nbsp;
              Call <a href="tel:+919365609948" style={{ color: "var(--gold, #b5943b)" }}>+91 93656 09948</a> for help
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="modal-section">
            <div className="modal-section-label">🛡 Cancellation Policy</div>
            <div className="cancel-grid">
              <div className="cancel-cell">
                <div className="cancel-pct" style={{ color: "#27ae60" }}>100%</div>
                <div className="cancel-when">Cancel <strong>1 week</strong> or more before</div>
              </div>
              <div className="cancel-cell">
                <div className="cancel-pct" style={{ color: "#f39c12" }}>50%</div>
                <div className="cancel-when">Cancel <strong>3 days</strong> before</div>
              </div>
              <div className="cancel-cell">
                <div className="cancel-pct" style={{ color: "#e74c3c" }}>0%</div>
                <div className="cancel-when">After <strong>3 days</strong> — no refund</div>
              </div>
            </div>
            <p style={{ fontSize: "0.78rem", color: "#555", lineHeight: 1.7, marginTop: "0.5rem" }}>
              If the National Park authority does not permit entry on your safari day, a <strong>full refund</strong> is
              processed within 24 hours.
            </p>
          </div>

          {/* Park Rules (dynamic — only shown once a park is selected) */}
          {park && rules.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-label">ℹ {PARK_INFO[park].label} Rules</div>
              <ul className="park-rules-modal-list">
                {rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
