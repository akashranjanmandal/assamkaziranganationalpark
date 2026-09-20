"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";

interface Guest {
  name: string;
  age: number;
  contact?: string;
  aadhaar_path?: string;
}

interface Booking {
  id: number;
  created_at: string;
  safari_destination: string;
  safari_date: string;
  time_slot: string;
  total_price: number;
  primary_contact: string;
  guests: Guest[];
  payment_status: string;
  payment_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  vehicle_number: string | null;
  driver_name: string | null;
  driver_contact: string | null;
}

export default function AdminBookingsPage() {
  const showToast = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [destFilter, setDestFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [vehicleDrafts, setVehicleDrafts] = useState<Record<number, { vn: string; dn: string; dc: string }>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load bookings");
      setBookings(json.bookings ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load bookings", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.payment_status !== "confirmed").length,
      today: bookings.filter((b) => b.safari_date === today).length,
      revenue: bookings.reduce((s, b) => s + (b.total_price || 0), 0),
    };
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return bookings.filter((b) => {
      const mq =
        !q ||
        String(b.id).includes(q) ||
        (b.primary_contact || "").includes(q) ||
        (b.guests?.[0]?.name || "").toLowerCase().includes(q);
      const md = !destFilter || (b.safari_destination || "").toLowerCase().includes(destFilter);
      const ms = !statusFilter || b.payment_status === statusFilter;
      return mq && md && ms;
    });
  }, [bookings, query, destFilter, statusFilter]);

  async function confirmBooking(id: number) {
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "confirmed" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to confirm");
      showToast(`Booking #${id} confirmed!`, "success");
      const b = bookings.find((x) => x.id === id);
      if (b) sendConfirmationWA(b);
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to confirm", "error");
    }
  }

  function sendConfirmationWA(b: Booking) {
    const contact = (b.primary_contact || "").replace(/\D/g, "");
    if (!contact) {
      showToast("No contact number for this booking — cannot send WhatsApp confirmation.", "error");
      return;
    }
    const ds = b.safari_date
      ? new Date(`${b.safari_date}T12:00:00`).toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : b.safari_date;
    const guests = b.guests || [];
    const primaryName = guests[0]?.name || "";
    const otherNames = guests.slice(1).map((g) => g.name).filter(Boolean);
    const namesLine = otherNames.length
      ? `*Guest Name:* ${primaryName}\n*Other Guests:* ${otherNames.join(", ")}\n`
      : primaryName
        ? `*Guest Name:* ${primaryName}\n`
        : "";
    const msg = `🦏 *Assam Wild Safari — Booking Confirmed!*\n\n*Booking ID:* #${b.id}\n${namesLine}*Park:* ${b.safari_destination}\n*Date:* ${ds}\n*Time:* ${b.time_slot}\n\nYour jeep safari is confirmed. We will provide you the contact number of the jeep driver 24 hours before the safari time.\n\nQueries: +91 97098 84206 / +91 93656 09948\n\n_Happy Wildlifing! 🌿_`;
    window.open(`https://wa.me/${contact}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  }

  async function saveVehicleDetails(id: number) {
    const draft = vehicleDrafts[id];
    const b = bookings.find((x) => x.id === id);
    const vn = draft?.vn ?? b?.vehicle_number ?? "";
    const dn = draft?.dn ?? b?.driver_name ?? "";
    const dc = draft?.dc ?? b?.driver_contact ?? "";
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_number: vn, driver_name: dn, driver_contact: dc }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      showToast(`Vehicle details saved for #${id}`, "success");
      setBookings((prev) => prev.map((x) => (x.id === id ? { ...x, vehicle_number: vn, driver_name: dn, driver_contact: dc } : x)));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    }
  }

  function notifyGuestWithVehicle(id: number) {
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    const draft = vehicleDrafts[id];
    const vn = draft?.vn ?? b.vehicle_number ?? "TBD";
    const dn = draft?.dn ?? b.driver_name ?? "TBD";
    const dc = draft?.dc ?? b.driver_contact ?? "TBD";
    const contact = (b.primary_contact || "").replace(/\D/g, "");
    if (!contact) {
      showToast("No contact number for this booking.", "error");
      return;
    }
    const ds = b.safari_date
      ? new Date(`${b.safari_date}T12:00:00`).toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : b.safari_date;
    const msg = `🦏 *Assam Wild Safari — Confirmed!*\n\n*Booking ID:* #${b.id}\n*Park:* ${b.safari_destination}\n*Date:* ${ds}\n*Time:* ${b.time_slot}\n\n*Vehicle & Driver:*\n🚗 *Vehicle No.:* ${vn}\n👤 *Driver:* ${dn}\n📞 *Driver Contact:* ${dc}\n\n⚠ *Please share your hotel / pickup location at least 24 hours before safari.*\n\nQueries: +91 97098 84206 / +91 93656 09948\n\n_Happy Wildlifing! 🌿_`;
    window.open(`https://wa.me/${contact}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  }

  async function viewFile(path: string | null | undefined) {
    if (!path) {
      showToast("File not available.", "error");
      return;
    }
    window.open(`/api/files/${path}`, "_blank", "noopener");
  }

  return (
    <div>
      <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.8rem" }}>
        <StatCard label="Total Bookings" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="Today's Safaris" value={stats.today} />
        <StatCard label="Total Revenue" value={`₹${stats.revenue.toLocaleString("en-IN")}`} />
      </div>

      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.2rem", flexWrap: "wrap" }}>
        <input
          className="form-input"
          style={{ flex: 1, minWidth: 200, padding: "0.6rem 0.9rem" }}
          placeholder="Search ID, name, contact…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="form-input" style={{ padding: "0.6rem 0.9rem", width: "auto" }} value={destFilter} onChange={(e) => setDestFilter(e.target.value)}>
          <option value="">All Destinations</option>
          <option value="kaziranga">Kaziranga</option>
          <option value="manas">Manas</option>
        </select>
        <select className="form-input" style={{ padding: "0.6rem 0.9rem", width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="awaiting_payment">Awaiting Payment</option>
          <option value="paid">Paid</option>
          <option value="confirmed">Confirmed</option>
        </select>
        <button className="admin-btn admin-btn-ghost" onClick={load}>
          ↻ Refresh
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Booking Date</th>
              <th>Destination</th>
              <th>Safari Date</th>
              <th>Slot</th>
              <th>Contact + Age</th>
              <th>Aadhaar</th>
              <th>Confirmation</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="admin-empty">Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-empty">No bookings found.</td>
              </tr>
            ) : (
              filtered.map((b) => {
                const isK = (b.safari_destination || "").toLowerCase().includes("kaziranga");
                const primary = b.guests?.[0] || ({} as Guest);
                const ds = b.safari_date
                  ? new Date(`${b.safari_date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "—";
                const draft = vehicleDrafts[b.id] ?? { vn: b.vehicle_number ?? "", dn: b.driver_name ?? "", dc: b.driver_contact ?? "" };
                return (
                  <>
                    <tr key={b.id} style={{ cursor: "pointer" }} onClick={() => setOpenId(openId === b.id ? null : b.id)}>
                      <td><strong>#{b.id}</strong></td>
                      <td style={{ fontSize: "0.8rem" }}>{new Date(b.created_at).toLocaleDateString("en-IN")}</td>
                      <td><span className={`badge ${isK ? "badge-confirmed" : "badge-pending"}`}>{isK ? "Kaziranga" : "Manas"}</span></td>
                      <td>{ds}</td>
                      <td style={{ fontSize: "0.8rem" }}>{b.time_slot || "—"}</td>
                      <td>
                        {b.primary_contact || "—"}
                        <br />
                        <span style={{ fontSize: "0.7rem", color: "#888" }}>Age {primary.age ?? "—"}</span>
                      </td>
                      <td>
                        {primary.aadhaar_path ? (
                          <span
                            style={{ fontSize: "0.73rem", textDecoration: "underline", cursor: "pointer", color: "var(--forest-dark)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              viewFile(primary.aadhaar_path);
                            }}
                          >
                            📎 View
                          </span>
                        ) : (
                          <span style={{ color: "#bbb", fontSize: "0.78rem" }}>—</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <span className={`badge ${b.payment_status === "confirmed" ? "badge-confirmed" : b.payment_status === "paid" ? "badge-confirmed" : "badge-pending"}`}>
                          {b.payment_status === "confirmed" ? "Confirmed" : b.payment_status === "paid" ? "Paid" : "Awaiting Payment"}
                        </span>
                        <br />
                        <div style={{ marginTop: "0.3rem", display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                          {b.payment_status === "paid" && (
                            <button className="admin-btn admin-btn-primary" style={{ padding: "0.28rem 0.6rem", fontSize: "0.68rem" }} onClick={() => confirmBooking(b.id)}>
                              Confirm
                            </button>
                          )}
                          <button
                            className="admin-btn"
                            style={{ padding: "0.28rem 0.6rem", fontSize: "0.68rem", background: "#25d366", color: "#fff" }}
                            onClick={() => notifyGuestWithVehicle(b.id)}
                          >
                            Notify
                          </button>
                        </div>
                      </td>
                    </tr>
                    {openId === b.id && (
                      <tr key={`${b.id}-detail`}>
                        <td colSpan={8} style={{ background: "#f0faf0", padding: "1.5rem" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: "1rem" }}>
                            <div style={{ background: "#fff", padding: "1.2rem", border: "1px solid #eee" }}>
                              <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--gold)", marginBottom: "0.9rem" }}>
                                Booking Info
                              </div>
                              <DetailField label="Destination" value={b.safari_destination} />
                              <DetailField label="Date" value={b.safari_date} />
                              <DetailField label="Time Slot" value={b.time_slot} />
                              <DetailField label="Total" value={`₹${(b.total_price || 0).toLocaleString("en-IN")}`} />
                              <DetailField label="Razorpay Payment ID" value={b.razorpay_payment_id || b.payment_id || "—"} />
                              <DetailField label="Razorpay Order ID" value={b.razorpay_order_id || "—"} />
                              <DetailField label="Booked On" value={new Date(b.created_at).toLocaleString("en-IN")} />
                            </div>
                            <div style={{ background: "#fff", padding: "1.2rem", border: "1px solid #eee" }}>
                              <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--gold)", marginBottom: "0.9rem" }}>
                                Guests
                              </div>
                              <ul style={{ listStyle: "none", display: "grid", gap: "0.35rem", padding: 0, margin: 0 }}>
                                {(b.guests || []).map((g, i) => (
                                  <li key={i} style={{ fontSize: "0.83rem", padding: "0.45rem 0.8rem", background: "#f5f5f5", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                    <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--gold)" }}>G{i + 1}</span>
                                    {g.name} · Age {g.age}
                                    {g.contact ? ` · ${g.contact}` : ""}
                                    {g.aadhaar_path && (
                                      <span style={{ fontSize: "0.73rem", textDecoration: "underline", cursor: "pointer" }} onClick={() => viewFile(g.aadhaar_path)}>
                                        📎 Aadhaar
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div style={{ background: "#fff", padding: "1.2rem", border: "1px solid #eee" }}>
                              <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--gold)", marginBottom: "0.9rem" }}>
                                Vehicle &amp; Driver
                              </div>
                              <p style={{ fontSize: "0.76rem", color: "var(--forest-mid)", marginBottom: "1rem" }}>
                                Save details then tap Notify to WhatsApp the guest.
                              </p>
                              <div style={{ display: "grid", gap: "0.6rem" }}>
                                <input
                                  className="form-input"
                                  style={{ padding: "0.55rem 0.8rem", fontSize: "0.85rem" }}
                                  placeholder="AS-01-AB-1234"
                                  value={draft.vn}
                                  onChange={(e) => setVehicleDrafts((prev) => ({ ...prev, [b.id]: { ...draft, vn: e.target.value } }))}
                                />
                                <input
                                  className="form-input"
                                  style={{ padding: "0.55rem 0.8rem", fontSize: "0.85rem" }}
                                  placeholder="Driver name"
                                  value={draft.dn}
                                  onChange={(e) => setVehicleDrafts((prev) => ({ ...prev, [b.id]: { ...draft, dn: e.target.value } }))}
                                />
                                <input
                                  className="form-input"
                                  style={{ padding: "0.55rem 0.8rem", fontSize: "0.85rem" }}
                                  placeholder="+91 XXXXX"
                                  value={draft.dc}
                                  onChange={(e) => setVehicleDrafts((prev) => ({ ...prev, [b.id]: { ...draft, dc: e.target.value } }))}
                                />
                                <button className="admin-btn admin-btn-primary" onClick={() => saveVehicleDetails(b.id)}>
                                  Save
                                </button>
                              </div>
                              <button
                                className="admin-btn"
                                style={{ marginTop: "0.8rem", background: "#25d366", color: "#fff", width: "100%" }}
                                onClick={() => notifyGuestWithVehicle(b.id)}
                              >
                                Notify Guest via WhatsApp
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "#fff", padding: "1.3rem", borderLeft: "4px solid var(--gold)" }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--forest-mid)", marginBottom: "0.35rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.9rem", fontWeight: 700, color: "var(--forest-black)", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "0.55rem", fontSize: "0.84rem" }}>
      <label style={{ fontSize: "0.62rem", color: "var(--forest-mid)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "0.12rem" }}>
        {label}
      </label>
      {value}
    </div>
  );
}
