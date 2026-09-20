"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import "./booking.css";
import { useToast } from "@/components/Toast";
import { DetailsModal } from "@/components/DetailsModal";
import { uploadFile } from "@/lib/upload-client";
import { publicEnv } from "@/lib/env";
import {
  ParkKey,
  PARK_INFO,
  calcTotal,
  getParkSlots,
  isClosedDate,
  getParkRules,
} from "@/lib/booking-data";

interface GuestForm {
  name: string;
  age: string;
  contact: string;
  aadhaarFile: File | null;
  aadhaarKey: string | null;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const STEP_LABELS = ["Destination", "Schedule", "Guests", "Payment"];

function emptyGuest(): GuestForm {
  return { name: "", age: "", contact: "", aadhaarFile: null, aadhaarKey: null };
}

export default function BookingPage() {
  const showToast = useToast();
  const [step, setStep] = useState(0);
  const [park, setPark] = useState<ParkKey | "">("");
  const [date, setDate] = useState("");
  const [slotId, setSlotId] = useState("");
  const [slotLabel, setSlotLabel] = useState("");
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [guests, setGuests] = useState<GuestForm[]>([emptyGuest()]);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const totalGuests = adultCount + childCount;
  const total = useMemo(() => (park ? calcTotal(park, adultCount) : 0), [park, adultCount]);
  const closed = park ? isClosedDate(park, date) : false;
  const slots = park ? getParkSlots(park) : [];
  const rules = park ? getParkRules(park) : [];

  function ensureGuestsLength(n: number) {
    setGuests((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(emptyGuest());
      while (next.length > n) next.pop();
      return next;
    });
  }

  function goToStep(n: number) {
    if (n === 2) ensureGuestsLength(totalGuests);
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep0() {
    if (!park) {
      showToast("Please select a national park.", "error");
      return false;
    }
    return true;
  }

  function validateStep1() {
    if (!date) {
      showToast("Please select a safari date.", "error");
      return false;
    }
    if (closed) {
      showToast("Manas is closed on Tuesdays. Please choose another date.", "error");
      return false;
    }
    if (!slotId) {
      showToast("Please select a time slot.", "error");
      return false;
    }
    return true;
  }

  function validateStep2() {
    for (let i = 0; i < guests.length; i++) {
      const g = guests[i];
      if (!g.name.trim()) {
        showToast(`Guest ${i + 1}: name is required.`, "error");
        return false;
      }
      if (!g.age.trim()) {
        showToast(`Guest ${i + 1}: age is required.`, "error");
        return false;
      }
      if (i === 0 && !g.contact.trim()) {
        showToast("Primary guest: contact number is required.", "error");
        return false;
      }
      if (i === 0 && !g.aadhaarFile && !g.aadhaarKey) {
        showToast("Primary guest: Aadhaar upload is required.", "error");
        return false;
      }
    }
    return true;
  }

  async function handleNext() {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    if (step === 2) {
      if (!validateStep2()) return;
      const primary = guests[0];
      if (primary.aadhaarFile && !primary.aadhaarKey) {
        try {
          setSubmitting(true);
          const key = await uploadFile(primary.aadhaarFile, "aadhaar");
          setGuests((prev) => {
            const next = [...prev];
            next[0] = { ...next[0], aadhaarKey: key };
            return next;
          });
        } catch (e) {
          showToast(e instanceof Error ? e.message : "Aadhaar upload failed", "error");
          setSubmitting(false);
          return;
        }
        setSubmitting(false);
      }
    }
    goToStep(Math.min(step + 1, 3));
  }

  function handleBack() {
    goToStep(Math.max(step - 1, 0));
  }

  async function createBookingRecord(): Promise<number | null> {
    if (!park) return null;
    const primary = guests[0];
    const payload = {
      safari_destination: park,
      safari_date: date,
      time_slot: slotLabel,
      price_per_person: PARK_INFO[park].price,
      num_guests: totalGuests,
      num_adults: adultCount,
      num_children: childCount,
      chargeable_guests: Math.min(adultCount, totalGuests),
      total_price: total,
      primary_contact: primary.contact.trim(),
      guests: guests.map((g, i) => ({
        name: g.name.trim(),
        age: Number(g.age) || 0,
        ...(i === 0 ? { contact: primary.contact.trim(), aadhaar_path: primary.aadhaarKey ?? undefined } : {}),
      })),
      payment_method: "razorpay" as const,
    };

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to create booking");
    }
    const data = await res.json();
    return data.booking?.id ?? data.booking_id ?? null;
  }

  async function handlePay() {
    if (!park) return;
    setSubmitting(true);
    try {
      let id = bookingId;
      if (!id) {
        id = await createBookingRecord();
        setBookingId(id);
      }
      if (!id) throw new Error("Could not create booking record");

      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaise: total * 100, receipt: `booking_${id}` }),
      });
      if (!orderRes.ok) {
        const body = await orderRes.json().catch(() => ({}));
        throw new Error(body.error || "Could not start payment");
      }
      const order = await orderRes.json();

      if (!window.Razorpay) {
        throw new Error("Payment gateway failed to load. Please refresh and try again.");
      }

      const rzp = new window.Razorpay({
        key: publicEnv.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: "Assam Wild Safari",
        description: `${PARK_INFO[park].label} Jeep Safari Booking`,
        order_id: order.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, bookingId: id }),
            });
            if (!verifyRes.ok) {
              throw new Error("Payment verification failed");
            }
            setConfirmed(true);
            showToast("Payment verified — booking confirmed!", "success");
          } catch {
            showToast("Payment verification failed. Contact support with your payment ID.", "error");
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
        prefill: {
          contact: guests[0].contact,
          name: guests[0].name,
        },
        theme: { color: "#b5943b" },
      });
      rzp.open();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Payment failed to start", "error");
      setSubmitting(false);
    }
  }

  if (confirmed && park) {
    return (
      <div className="booking-page-root">
        <header className="bk-header">
          <Link href="/" className="bk-logo-group">
            <img src="/images/logo.jpeg" alt="Assam Wild Safari" className="bk-logo-img" />
            <div>
              <div className="bk-logo-name">
                Assam <em>Wild</em> Safari
              </div>
              <span className="bk-logo-sub">Northeast India&apos;s Premium Safari</span>
            </div>
          </Link>
          <Link href="/" className="bk-home-link">
            ← Back to Home
          </Link>
        </header>
        <div className="booking-form-wrap">
          <div id="booking-form-area" className="booking-success">
            <span className="section-label">Booking Confirmed</span>
            <h2 className="section-title">
              SAFARI
              <br />
              LOCKED IN
            </h2>
            <div className="success-details">
              <div className="success-row">
                <span className="success-label">Park</span>
                <span className="success-value">{PARK_INFO[park].label}</span>
              </div>
              <div className="success-row">
                <span className="success-label">Date</span>
                <span className="success-value">{date}</span>
              </div>
              <div className="success-row">
                <span className="success-label">Time Slot</span>
                <span className="success-value">{slotLabel}</span>
              </div>
              <div className="success-row">
                <span className="success-label">Guests</span>
                <span className="success-value">{totalGuests}</span>
              </div>
              <div className="success-row">
                <span className="success-label">Total Paid</span>
                <span className="success-value">₹{total.toLocaleString()}</span>
              </div>
              <div className="success-row">
                <span className="success-label">Reference</span>
                <span className="success-value">#{bookingId}</span>
              </div>
            </div>
            <div className="post-booking-info">
              <div className="pbi-title">What Happens Next</div>
              <div className="pbi-item">
                <span className="pbi-icon">◆</span>
                <span className="pbi-text">
                  Vehicle &amp; driver details will be shared with you <strong>24 hours before</strong> your safari
                  via WhatsApp on {guests[0].contact}.
                </span>
              </div>
              <div className="pbi-item">
                <span className="pbi-icon">◆</span>
                <span className="pbi-text">Carry a printed or digital copy of your Aadhaar card on the day.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page-root">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <header className="bk-header">
        <Link href="/" className="bk-logo-group">
          <img src="/images/logo.jpeg" alt="Assam Wild Safari" className="bk-logo-img" />
          <div>
            <div className="bk-logo-name">
              Assam <em>Wild</em> Safari
            </div>
            <span className="bk-logo-sub">Northeast India&apos;s Premium Safari</span>
          </div>
        </Link>
        <Link href="/" className="bk-home-link">
          ← Back to Home
        </Link>
      </header>

      <div className="step-bar" id="step-bar">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className={`step-indicator${i === step ? " active" : ""}${i < step ? " completed" : ""}`}>
            <div className="step-num">{i < step ? "✓" : i + 1}</div>
            <div className="step-label-text">{label}</div>
          </div>
        ))}
      </div>

      <div className="booking-form-wrap">
        <div id="booking-form-area">
          {step === 0 && (
            <div className="step-content">
              <span className="section-label">Step 1 of 4 — Choose Your Destination</span>
              <h2 className="section-title">
                PICK YOUR
                <br />
                NATIONAL PARK
              </h2>
              <div className="park-selector">
                {(Object.keys(PARK_INFO) as ParkKey[]).map((key) => {
                  const info = PARK_INFO[key];
                  const selected = park === key;
                  return (
                    <div
                      key={key}
                      className={`park-option${selected ? " selected" : ""}`}
                      onClick={() => setPark(key)}
                    >
                      <div className="park-option-img" style={{ backgroundImage: `url('${info.image}')` }} />
                      <div className="park-option-info">
                        <span className="park-option-tag">{info.tag}</span>
                        <div className="park-option-name">{info.label.toUpperCase()}</div>
                        <div className="park-rate-row" style={{ marginTop: "0.6rem" }}>
                          <span className="park-rate-label">Shared Jeep</span>
                          <span className="park-rate-val">
                            ₹{info.price.toLocaleString()} <small>/ person</small>
                          </span>
                        </div>
                        <div className="park-rate-row park-rate-private">
                          <span className="park-rate-label">Private Jeep</span>
                          <span className="park-rate-val">
                            ₹{info.jeepPrice.toLocaleString()} <small>/ jeep · above 3 (max 6)</small>
                          </span>
                        </div>
                      </div>
                      <div className="selected-check">✓</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && park && (
            <div className="step-content">
              <span className="section-label">Step 2 of 4 — Schedule</span>
              <h2 className="section-title">
                PICK YOUR
                <br />
                MOMENT
              </h2>
              <div className="two-col" style={{ marginTop: "1.5rem" }}>
                <div className="form-group">
                  <label className="form-label">Safari Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  {closed && (
                    <div className="tuesday-warning">
                      ⚠ Manas Bansbari Range is closed every Tuesday. Please pick another date.
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Number of Guests</label>
                  <div style={{ marginTop: "0.8rem", display: "grid", gap: "1rem" }}>
                    <div>
                      <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: "0.5rem" }}>
                        Adults <span style={{ fontWeight: 400 }}>(above 5 yrs · chargeable)</span>
                      </div>
                      <div className="guest-count-row">
                        <button type="button" className="count-btn" onClick={() => setAdultCount((v) => Math.max(1, v - 1))}>
                          −
                        </button>
                        <span className="count-display">{adultCount}</span>
                        <button type="button" className="count-btn" onClick={() => setAdultCount((v) => v + 1)}>
                          +
                        </button>
                        <span className="count-label">adult(s)</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: "0.5rem" }}>
                        Children <span style={{ fontWeight: 400 }}>(5 yrs &amp; under · free)</span>
                      </div>
                      <div className="guest-count-row">
                        <button type="button" className="count-btn" onClick={() => setChildCount((v) => Math.max(0, v - 1))}>
                          −
                        </button>
                        <span className="count-display">{childCount}</span>
                        <button type="button" className="count-btn" onClick={() => setChildCount((v) => v + 1)}>
                          +
                        </button>
                        <span className="count-label">child(ren)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label className="form-label">Time Slot</label>
                <div className="time-slots">
                  {slots.map((s) => (
                    <div
                      key={s.id}
                      className={`time-slot${slotId === s.id ? " selected" : ""}`}
                      onClick={() => {
                        setSlotId(s.id);
                        setSlotLabel(`${s.name} (${s.time})`);
                      }}
                    >
                      <div className="time-slot-name">{s.name}</div>
                      <div className="time-slot-time">{s.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="park-rules-box">
                <div className="park-rules-title">Park Rules &amp; Information</div>
                <ul className="park-rules-list">
                  {rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <span className="section-label">Step 3 of 4 — Guest Details</span>
              <h2 className="section-title">
                GUEST
                <br />
                DETAILS
              </h2>
              <p className="form-hint" style={{ marginBottom: "1.5rem" }}>
                The <strong>primary guest</strong> (Guest 1) must provide Aadhaar card and contact. Additional guests
                only need name and age.
              </p>
              {guests.map((g, i) => (
                <div key={i} className="guest-card">
                  <div className="guest-card-title">
                    Guest {i + 1}
                    {i === 0 ? " · Primary" : ""}
                  </div>
                  <div className="guest-fields-grid">
                    <div className="form-group form-group-tight">
                      <label className="form-label">Full Name</label>
                      <input
                        className="form-input"
                        value={g.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          setGuests((prev) => prev.map((gg, idx) => (idx === i ? { ...gg, name: v } : gg)));
                        }}
                      />
                    </div>
                    <div className="form-group form-group-tight">
                      <label className="form-label">Age</label>
                      <input
                        type="number"
                        className="form-input"
                        value={g.age}
                        onChange={(e) => {
                          const v = e.target.value;
                          setGuests((prev) => prev.map((gg, idx) => (idx === i ? { ...gg, age: v } : gg)));
                        }}
                      />
                    </div>
                    {i === 0 && (
                      <>
                        <div className="form-group form-group-tight">
                          <label className="form-label">Contact Number</label>
                          <input
                            className="form-input"
                            value={g.contact}
                            onChange={(e) => {
                              const v = e.target.value;
                              setGuests((prev) => prev.map((gg, idx) => (idx === 0 ? { ...gg, contact: v } : gg)));
                            }}
                          />
                        </div>
                        <div className="form-group form-group-tight guest-fields-full">
                          <label className="form-label">Aadhaar Upload</label>
                          <label className={`aadhaar-upload-area${g.aadhaarFile ? " has-file" : ""}`}>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setGuests((prev) =>
                                  prev.map((gg, idx) => (idx === 0 ? { ...gg, aadhaarFile: file, aadhaarKey: null } : gg))
                                );
                              }}
                            />
                            <span className="aadhaar-upload-label">
                              {g.aadhaarFile ? "File selected — tap to change" : "Tap to upload Aadhaar (max 15MB)"}
                            </span>
                            {g.aadhaarFile && <span className="aadhaar-upload-name">{g.aadhaarFile.name}</span>}
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && park && (
            <div className="step-content">
              <span className="section-label">Step 4 of 4 — Payment</span>
              <h2 className="section-title">
                COMPLETE
                <br />
                PAYMENT
              </h2>
              <div className="payment-amount-card">
                <div className="pay-amount-label">Total Amount Payable</div>
                <div className="pay-amount-value">₹{total.toLocaleString()}</div>
                <div className="pay-amount-sub">{totalGuests} guest(s) · {PARK_INFO[park].label}</div>
              </div>

              <div className="tnc-box">
                <div className="tnc-title">Before You Pay</div>
                <ul className="tnc-list">
                  <li>Payment is processed securely via Razorpay (cards, UPI, netbanking, wallets).</li>
                  <li>Your booking is confirmed only after the payment signature is verified on our server.</li>
                  <li>Vehicle &amp; driver details are shared 24 hours before your safari via WhatsApp.</li>
                </ul>
              </div>

              <button className="btn-primary" style={{ width: "100%" }} onClick={handlePay} disabled={submitting}>
                {submitting ? "Processing…" : `Pay ₹${total.toLocaleString()} with Razorpay`}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="booking-bottom-bar">
        <div className="bbb-brief">
          <div className="bbb-item hide-xs">
            <span className="bbb-label">Park</span>
            <span className="bbb-val">{park ? PARK_INFO[park].label : "—"}</span>
          </div>
          <div className="bbb-item">
            <span className="bbb-label">Total</span>
            <span className="bbb-total-val">₹{total.toLocaleString()}</span>
          </div>
        </div>
        <div className="bbb-actions">
          <button className="bbb-details-btn" type="button" onClick={() => setDetailsOpen(true)}>
            📋 Details
          </button>
          {step > 0 && (
            <button className="bbb-back-btn" onClick={handleBack} disabled={submitting}>
              Back
            </button>
          )}
          {step < 3 && (
            <button className="bbb-next-btn" onClick={handleNext} disabled={submitting}>
              {submitting ? "Please wait…" : "Continue"}
            </button>
          )}
        </div>
      </div>

      <DetailsModal open={detailsOpen} onClose={() => setDetailsOpen(false)} park={park} />
    </div>
  );
}
