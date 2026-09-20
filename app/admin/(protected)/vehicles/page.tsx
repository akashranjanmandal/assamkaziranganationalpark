"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

interface Vehicle {
  id: number;
  name: string;
  capacity: number;
  price_per_day: number | null;
  description: string | null;
  active: boolean;
}

const emptyForm = { name: "", capacity: "", price_per_day: "", description: "" };

export default function AdminVehiclesPage() {
  const showToast = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vehicles");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load vehicles");
      setVehicles(json.vehicles ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load vehicles", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditId(null);
  }

  function startEdit(v: Vehicle) {
    setForm({
      name: v.name,
      capacity: String(v.capacity),
      price_per_day: v.price_per_day != null ? String(v.price_per_day) : "",
      description: v.description || "",
    });
    setEditId(v.id);
  }

  async function save() {
    const capacity = parseInt(form.capacity, 10);
    const price = form.price_per_day ? parseFloat(form.price_per_day) : null;
    if (!form.name.trim() || !capacity) {
      showToast("Please fill name and capacity.", "error");
      return;
    }
    const payload = { name: form.name.trim(), capacity, price_per_day: price, description: form.description.trim() || null };
    try {
      const res = editId
        ? await fetch(`/api/admin/vehicles/${editId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/vehicles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      showToast(editId ? "Vehicle updated!" : "Vehicle added!", "success");
      resetForm();
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    }
  }

  async function toggleActive(v: Vehicle) {
    try {
      const res = await fetch(`/api/admin/vehicles/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !v.active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      showToast(v.active ? "Vehicle disabled." : "Vehicle enabled.", "success");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Update failed", "error");
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this vehicle? Cannot undo.")) return;
    try {
      const res = await fetch(`/api/admin/vehicles/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      showToast("Vehicle deleted.", "success");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  }

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1rem" }}>
        {editId ? "Edit Vehicle" : "Add Vehicle"}
      </div>
      <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div>
          <label className="l-label" style={{ marginBottom: "0.4rem" }}>Vehicle Name</label>
          <input className="form-input" placeholder="e.g. Innova Crysta" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="l-label" style={{ marginBottom: "0.4rem" }}>Capacity</label>
          <input className="form-input" type="number" min={1} placeholder="e.g. 5" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        </div>
        <div>
          <label className="l-label" style={{ marginBottom: "0.4rem" }}>Price / Day (₹)</label>
          <input className="form-input" type="number" min={0} placeholder="e.g. 3500" value={form.price_per_day} onChange={(e) => setForm({ ...form, price_per_day: e.target.value })} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="l-label" style={{ marginBottom: "0.4rem" }}>Description (Optional)</label>
          <input className="form-input" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div style={{ display: "flex", gap: "0.8rem" }}>
          <button className="admin-btn admin-btn-primary" onClick={save}>Save Vehicle</button>
          {editId && (
            <button className="admin-btn admin-btn-ghost" onClick={resetForm}>Cancel</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="admin-empty">Loading…</div>
      ) : vehicles.length === 0 ? (
        <div className="admin-empty">No vehicles yet. Add one above.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Capacity</th>
                <th>₹ / Day</th>
                <th>Description</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.name}</strong></td>
                  <td>{v.capacity} pax</td>
                  <td>₹{Number(v.price_per_day ?? 0).toLocaleString("en-IN")}</td>
                  <td style={{ fontSize: "0.8rem", color: "#666" }}>{v.description || "—"}</td>
                  <td><span className={`badge ${v.active ? "badge-confirmed" : "badge-pending"}`}>{v.active ? "Active" : "Inactive"}</span></td>
                  <td>
                    <button className="admin-btn" style={{ background: "#e3f0e4", color: "#1a5c2a" }} onClick={() => startEdit(v)}>Edit</button>
                    <button className="admin-btn admin-btn-danger" onClick={() => toggleActive(v)}>{v.active ? "Disable" : "Enable"}</button>
                    <button className="admin-btn admin-btn-danger" onClick={() => remove(v.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
