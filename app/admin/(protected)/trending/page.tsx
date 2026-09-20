"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

interface TrendingDay {
  title: string;
  activities: string[];
}

interface TrendingItinerary {
  id: number;
  title: string;
  duration: string;
  price_from: string | null;
  short_desc: string | null;
  days_json: string | null;
  details: string | null;
  active: boolean;
  sort_order: number;
}

const emptyForm = { title: "", duration: "", price_from: "", short_desc: "", note: "" };

export default function AdminTrendingPage() {
  const showToast = useToast();
  const [items, setItems] = useState<TrendingItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [days, setDays] = useState<TrendingDay[]>([]);
  const [editId, setEditId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trending");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load itineraries");
      setItems(json.itineraries ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load itineraries", "error");
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
    setDays([]);
    setEditId(null);
  }

  function addDay() {
    setDays((prev) => [...prev, { title: "", activities: [] }]);
  }

  function removeDay(idx: number) {
    setDays((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateDayTitle(idx: number, title: string) {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, title } : d)));
  }

  function updateDayActivities(idx: number, text: string) {
    const activities = text.split("\n").map((s) => s.trim()).filter(Boolean);
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, activities } : d)));
  }

  function startEdit(t: TrendingItinerary) {
    setForm({
      title: t.title,
      duration: t.duration,
      price_from: t.price_from || "",
      short_desc: t.short_desc || "",
      note: extractNote(t.details),
    });
    setEditId(t.id);
    try {
      setDays(t.days_json ? JSON.parse(t.days_json) : []);
    } catch {
      setDays([]);
    }
  }

  function extractNote(details: string | null): string {
    if (!details) return "";
    const m = details.match(/<div class="td-note">([\s\S]*?)<\/div>/);
    return m ? m[1] : "";
  }

  async function save() {
    if (!form.title.trim() || !form.duration.trim()) {
      showToast("Title and duration are required.", "error");
      return;
    }
    const payload = {
      title: form.title.trim(),
      duration: form.duration.trim(),
      price_from: form.price_from.trim() || null,
      short_desc: form.short_desc.trim() || null,
      days,
      note: form.note.trim() || undefined,
    };
    try {
      const res = editId
        ? await fetch(`/api/admin/trending/${editId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/trending", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      showToast(editId ? "Updated!" : "Trending itinerary added!", "success");
      resetForm();
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    }
  }

  async function toggleActive(t: TrendingItinerary) {
    try {
      const res = await fetch(`/api/admin/trending/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !t.active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      showToast(t.active ? "Hidden from site." : "Now visible on site.", "success");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Update failed", "error");
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this trending entry? Cannot undo.")) return;
    try {
      const res = await fetch(`/api/admin/trending/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      showToast("Deleted.", "success");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  }

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1.2rem" }}>
        {editId ? `Edit: ${form.title}` : "Add Trending Itinerary"}
      </div>

      <div style={{ background: "#fff", padding: "1.5rem", border: "1px solid #e0e0e0", marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.8rem", marginBottom: "0.8rem" }}>
          <FormField label="Title *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="e.g. Manas + Bhutan Panbang" />
          <FormField label="Duration *" value={form.duration} onChange={(v) => setForm({ ...form, duration: v })} placeholder="e.g. 3N / 4D" />
          <FormField label="Price From" value={form.price_from} onChange={(v) => setForm({ ...form, price_from: v })} placeholder="e.g. ₹18,500 / person" />
        </div>
        <div style={{ marginBottom: "1.2rem" }}>
          <FormField label="Short Description" value={form.short_desc} onChange={(v) => setForm({ ...form, short_desc: v })} placeholder="One-line description shown on card" />
        </div>

        <div style={{ borderTop: "2px solid #e0e0e0", paddingTop: "1.2rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#333" }}>Day-by-Day Itinerary</div>
            <button className="admin-btn admin-btn-primary" style={{ padding: "0.4rem 1rem", fontSize: "0.75rem" }} onClick={addDay}>
              + Add Day
            </button>
          </div>
          {days.map((d, idx) => (
            <div key={idx} style={{ background: "#f8f8f8", border: "1px solid #e0e0e0", padding: "1rem", marginBottom: "0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#888" }}>Day {idx + 1}</div>
                <button onClick={() => removeDay(idx)} style={{ background: "none", border: "none", color: "#c00", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>
                  ✕ Remove
                </button>
              </div>
              <div style={{ marginBottom: "0.6rem" }}>
                <FormField
                  label="Day Title"
                  value={d.title}
                  onChange={(v) => updateDayTitle(idx, v)}
                  placeholder="e.g. Arrival at Manas — Check-in & Evening Safari"
                />
              </div>
              <div>
                <label className="l-label" style={{ marginBottom: "0.3rem" }}>
                  Activities <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#aaa" }}>(one per line)</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  style={{ resize: "vertical" }}
                  placeholder={"Check in at resort\nEvening jeep safari\nDinner & bonfire"}
                  value={d.activities.join("\n")}
                  onChange={(e) => updateDayActivities(idx, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "1.2rem" }}>
          <label className="l-label" style={{ marginBottom: "0.4rem" }}>
            Inclusions / Note (shown at bottom of itinerary)
          </label>
          <textarea
            className="form-input"
            rows={2}
            style={{ resize: "vertical" }}
            placeholder="e.g. Includes: accommodation, meals, safari, transport. Excludes: airfare."
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>

        <div style={{ display: "flex", gap: "0.8rem" }}>
          <button className="admin-btn admin-btn-primary" onClick={save}>Save Itinerary</button>
          {editId && <button className="admin-btn admin-btn-ghost" onClick={resetForm}>Cancel</button>}
        </div>
      </div>

      {loading ? (
        <div className="admin-empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="admin-empty">No trending itineraries yet.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Title</th>
                <th>Duration</th>
                <th>Price</th>
                <th>Description</th>
                <th>Days</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                let dayCount = 0;
                try {
                  dayCount = t.days_json ? JSON.parse(t.days_json).length : 0;
                } catch {
                  /* ignore malformed days_json */
                }
                return (
                  <tr key={t.id}>
                    <td>{t.sort_order}</td>
                    <td><strong>{t.title}</strong></td>
                    <td>{t.duration}</td>
                    <td>{t.price_from || "—"}</td>
                    <td style={{ fontSize: "0.8rem", color: "#666" }}>{t.short_desc || "—"}</td>
                    <td style={{ textAlign: "center" }}>{dayCount ? <span className="badge badge-confirmed">{dayCount}d</span> : "—"}</td>
                    <td><span className={`badge ${t.active ? "badge-confirmed" : "badge-pending"}`}>{t.active ? "Active" : "Hidden"}</span></td>
                    <td>
                      <button className="admin-btn" style={{ background: "#e3f0e4", color: "#1a5c2a" }} onClick={() => startEdit(t)}>Edit</button>
                      <button className="admin-btn admin-btn-danger" onClick={() => toggleActive(t)}>{t.active ? "Hide" : "Show"}</button>
                      <button className="admin-btn admin-btn-danger" onClick={() => remove(t.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="l-label" style={{ marginBottom: "0.4rem" }}>{label}</label>
      <input className="form-input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
