"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

interface DropRate {
  id: number;
  route_name: string;
  vehicle_name: string;
  seats: number | null;
  price: number;
  active: boolean;
}

const EMPTY_FORM = { route_name: "", vehicle_name: "", seats: "", price: "" };

export default function AdminDropRatesPage() {
  const showToast = useToast();
  const [rates, setRates] = useState<DropRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/drop-rates");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load drop rates");
      setRates(json.rates ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load drop rates", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.route_name.trim() || !form.vehicle_name.trim() || !form.price) {
      showToast("Route, vehicle and price are required.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/drop-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_name: form.route_name.trim(),
          vehicle_name: form.vehicle_name.trim(),
          seats: form.seats ? Number(form.seats) : null,
          price: Number(form.price),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add rate");
      showToast("Drop rate added.", "success");
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to add rate", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(id: number, active: boolean) {
    try {
      const res = await fetch(`/api/admin/drop-rates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Update failed", "error");
    }
  }

  async function deleteRate(id: number) {
    if (!confirm("Delete this rate? Cannot undo.")) return;
    try {
      const res = await fetch(`/api/admin/drop-rates/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      showToast("Rate deleted.", "success");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  }

  return (
    <div>
      <form className="admin-form-grid" onSubmit={handleCreate}>
        <input
          className="form-input"
          placeholder="Route name"
          value={form.route_name}
          onChange={(e) => setForm((f) => ({ ...f, route_name: e.target.value }))}
        />
        <input
          className="form-input"
          placeholder="Vehicle name"
          value={form.vehicle_name}
          onChange={(e) => setForm((f) => ({ ...f, vehicle_name: e.target.value }))}
        />
        <input
          type="number"
          className="form-input"
          placeholder="Seats (optional)"
          value={form.seats}
          onChange={(e) => setForm((f) => ({ ...f, seats: e.target.value }))}
        />
        <input
          type="number"
          className="form-input"
          placeholder="Price (₹)"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
        />
        <button className="admin-btn admin-btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add Rate"}
        </button>
      </form>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Loading…</div>
        ) : rates.length === 0 ? (
          <div className="admin-empty">No drop rates yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Vehicle</th>
                <th>Seats</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id}>
                  <td>{r.route_name}</td>
                  <td>{r.vehicle_name}</td>
                  <td>{r.seats ?? "—"}</td>
                  <td>₹{r.price.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${r.active ? "badge-confirmed" : "badge-pending"}`}>
                      {r.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button className="admin-btn admin-btn-ghost" onClick={() => toggleActive(r.id, !r.active)}>
                      {r.active ? "Deactivate" : "Activate"}
                    </button>
                    <button className="admin-btn admin-btn-danger" onClick={() => deleteRate(r.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
