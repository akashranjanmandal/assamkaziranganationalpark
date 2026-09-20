"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";

interface Rental {
  id: number;
  created_at: string;
  vehicle_name: string | null;
  itinerary: string;
  pickup_date: string | null;
  num_days: number | null;
  num_passengers: number;
  total_cost: number | null;
  pickup_location: string | null;
  upi_ref: string | null;
  payment_screenshot_url: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  status: string;
}

export default function AdminCarRentalsPage() {
  const showToast = useToast();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed">("all");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/car-rentals");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load rentals");
      setRentals(json.rentals ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load rentals", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rentals;
    return rentals.filter((r) => r.status === filter);
  }, [rentals, filter]);

  async function confirmRental(id: number) {
    try {
      const res = await fetch(`/api/admin/car-rentals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      showToast("Rental confirmed!", "success");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Update failed", "error");
    }
  }

  function notifyGuest(r: Rental) {
    const phone = (r.customer_phone || "").replace(/\D/g, "");
    if (!phone) {
      showToast("No phone number.", "error");
      return;
    }
    const msg = `🚗 *Assam Wild Safari — Car Rental Confirmed!*\n\n*Vehicle:* ${r.vehicle_name}\n*Itinerary:* ${r.itinerary}\n*Pickup Date:* ${r.pickup_date}\n*Pickup Location:* ${r.pickup_location || "TBD"}\n*Passengers:* ${r.num_passengers}\n*Days:* ${r.num_days}\n\nOur team will contact you shortly with driver details.\n\nQueries: +91 93656 09948\n\n_Happy Travels! 🌿_`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
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
          <option value="all">All Rentals</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
        </select>
        <button className="admin-btn admin-btn-ghost" onClick={load}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="admin-empty">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">No rentals found.</div>
      ) : (
        filtered.map((r) => (
          <div key={r.id} style={{ background: "#fff", padding: "1.3rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <span style={{ fontWeight: 700 }}>{r.customer_name || "—"}</span>
                <span style={{ fontSize: "0.8rem", color: "var(--forest-mid)", marginLeft: "0.5rem" }}>{r.customer_phone || "—"}</span>
                <span className={`badge ${r.status === "confirmed" ? "badge-confirmed" : "badge-pending"}`} style={{ marginLeft: "0.5rem" }}>
                  {r.status}
                </span>
                <span style={{ fontSize: "0.72rem", color: "#aaa", marginLeft: "0.5rem" }}>
                  {new Date(r.created_at).toLocaleDateString("en-IN")}
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {r.status !== "confirmed" && (
                  <button className="admin-btn admin-btn-primary" onClick={() => confirmRental(r.id)}>
                    Confirm
                  </button>
                )}
                <button className="admin-btn" style={{ background: "#e8f5e9", color: "#1a5c2a" }} onClick={() => notifyGuest(r)}>
                  WhatsApp
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.5rem", marginTop: "0.8rem", fontSize: "0.82rem" }}>
              <div><span style={{ color: "var(--forest-mid)", fontWeight: 600 }}>Vehicle:</span> {r.vehicle_name || "—"}</div>
              <div><span style={{ color: "var(--forest-mid)", fontWeight: 600 }}>Itinerary:</span> {r.itinerary || "—"}</div>
              <div><span style={{ color: "var(--forest-mid)", fontWeight: 600 }}>Pickup Date:</span> {r.pickup_date || "—"}</div>
              <div><span style={{ color: "var(--forest-mid)", fontWeight: 600 }}>Days:</span> {r.num_days || "—"}</div>
              <div><span style={{ color: "var(--forest-mid)", fontWeight: 600 }}>Passengers:</span> {r.num_passengers || "—"}</div>
              <div><span style={{ color: "var(--forest-mid)", fontWeight: 600 }}>Total:</span> ₹{(r.total_cost || 0).toLocaleString("en-IN")}</div>
              <div><span style={{ color: "var(--forest-mid)", fontWeight: 600 }}>Pickup:</span> {r.pickup_location || "—"}</div>
              {r.upi_ref && <div><span style={{ color: "var(--forest-mid)", fontWeight: 600 }}>UTR:</span> {r.upi_ref}</div>}
            </div>
            {r.payment_screenshot_url && (
              <div style={{ marginTop: "0.6rem" }}>
                <a href={r.payment_screenshot_url} target="_blank" rel="noopener" style={{ fontSize: "0.78rem", color: "var(--gold)", fontWeight: 600 }}>
                  📎 View Payment Screenshot
                </a>
              </div>
            )}
            {r.customer_email && <div style={{ fontSize: "0.78rem", color: "#888", marginTop: "0.3rem" }}>Email: {r.customer_email}</div>}
          </div>
        ))
      )}
    </div>
  );
}
