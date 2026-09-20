"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { Vehicle } from "@/lib/supabase/reads";

export function CarRentalForm({ vehicles }: { vehicles: Vehicle[] }) {
  const showToast = useToast();
  const t = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    vehicle_name: "",
    itinerary: "",
    num_passengers: "1",
    pickup_date: "",
    pickup_location: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.itinerary.trim()) {
      showToast("Please describe your itinerary.", "error");
      return;
    }
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      showToast("Please provide your name and phone number.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/car-rental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_name: form.vehicle_name || undefined,
          itinerary: form.itinerary.trim(),
          num_passengers: Number(form.num_passengers) || 1,
          pickup_date: form.pickup_date || undefined,
          pickup_location: form.pickup_location.trim() || undefined,
          customer_name: form.customer_name.trim(),
          customer_phone: form.customer_phone.trim(),
          customer_email: form.customer_email.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit enquiry");
      }
      showToast("Enquiry submitted! We'll contact you shortly.", "success");
      setForm({
        vehicle_name: "",
        itinerary: "",
        num_passengers: "1",
        pickup_date: "",
        pickup_location: "",
        customer_name: "",
        customer_phone: "",
        customer_email: "",
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to submit enquiry", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 700, margin: "0 auto" }}>
      <div className="form-group">
        <label className="form-label">{t("cr_lbl_vehicle")}</label>
        <select className="form-input" value={form.vehicle_name} onChange={(e) => update("vehicle_name", e.target.value)}>
          <option value="">Any / No preference</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.name}>
              {v.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">{t("cr_lbl_itinerary")}</label>
        <textarea
          className="form-input"
          value={form.itinerary}
          onChange={(e) => update("itinerary", e.target.value)}
          placeholder="e.g. Guwahati to Kaziranga, 2 days"
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("cr_lbl_pax2")}</label>
        <input
          type="number"
          min={1}
          className="form-input"
          value={form.num_passengers}
          onChange={(e) => update("num_passengers", e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Pickup Date</label>
        <input type="date" className="form-input" value={form.pickup_date} onChange={(e) => update("pickup_date", e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Pickup Location</label>
        <input className="form-input" value={form.pickup_location} onChange={(e) => update("pickup_location", e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Your Name</label>
        <input className="form-input" value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Phone Number</label>
        <input className="form-input" value={form.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Email (optional)</label>
        <input type="email" className="form-input" value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} />
      </div>
      <p className="form-hint" style={{ marginBottom: "1rem" }}>{t("cr_note")}</p>
      <button className="btn-primary" style={{ width: "100%" }} type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : t("cr_submit")}
      </button>
    </form>
  );
}
