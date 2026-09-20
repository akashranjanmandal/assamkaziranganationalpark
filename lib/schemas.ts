import { z } from "zod";

/**
 * Server-side validation for every public write endpoint. The old static
 * site trusted whatever the browser sent straight into `sb.from(...).insert()`;
 * these schemas are the replacement — every POST body is parsed here before
 * it ever reaches the database.
 */

export const guestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  age: z.number().int().min(0).max(120),
  contact: z.string().trim().max(20).optional(),
  aadhaar_path: z.string().trim().max(500).optional(),
});

export const bookingSchema = z.object({
  safari_destination: z.string().trim().min(1).max(200),
  safari_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "safari_date must be YYYY-MM-DD"),
  time_slot: z.string().trim().min(1).max(120),
  price_per_person: z.number().int().nonnegative(),
  num_guests: z.number().int().positive(),
  num_adults: z.number().int().nonnegative(),
  num_children: z.number().int().nonnegative(),
  chargeable_guests: z.number().int().nonnegative(),
  total_price: z.number().int().nonnegative(),
  primary_contact: z.string().trim().min(5).max(20),
  guests: z.array(guestSchema).min(1),
  payment_method: z.enum(["qr", "razorpay"]).default("qr"),
  payment_id: z.string().trim().max(200).optional(),
  screenshot_path: z.string().trim().max(500).nullable().optional(),
});

export const reviewSchema = z.object({
  name: z.string().trim().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().min(1).max(2000),
  park: z.string().trim().max(120).optional(),
});

export const carRentalSchema = z.object({
  vehicle_id: z.union([z.string(), z.number()]).optional(),
  vehicle_name: z.string().trim().max(200).optional(),
  itinerary: z.string().trim().min(1).max(300),
  num_passengers: z.number().int().positive(),
  num_days: z.number().int().positive().optional(),
  pickup_date: z.string().optional(),
  pickup_location: z.string().trim().max(300).optional(),
  total_cost: z.number().nonnegative().optional(),
  customer_name: z.string().trim().max(120).optional(),
  customer_phone: z.string().trim().max(20).optional(),
  customer_email: z.string().trim().email().max(200).optional().or(z.literal("")),
  upi_ref: z.string().trim().max(200).optional(),
});

export const razorpayCreateOrderSchema = z.object({
  amountPaise: z.number().int().positive(),
  receipt: z.string().trim().max(100).optional(),
});

export const razorpayVerifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  bookingId: z.union([z.string(), z.number()]),
});

// ── Admin CRUD schemas ──────────────────────────────────────────────────
export const vehicleSchema = z.object({
  name: z.string().trim().min(1).max(200),
  capacity: z.number().int().positive(),
  price_per_day: z.number().nonnegative().nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  active: z.boolean().optional(),
});

export const trendingDaySchema = z.object({
  title: z.string().trim().max(300),
  activities: z.array(z.string().trim().max(500)),
});

export const trendingItinerarySchema = z.object({
  title: z.string().trim().min(1).max(300),
  duration: z.string().trim().min(1).max(60),
  price_from: z.string().trim().max(120).nullable().optional(),
  short_desc: z.string().trim().max(500).nullable().optional(),
  days: z.array(trendingDaySchema).optional(),
  note: z.string().trim().max(2000).optional(),
  active: z.boolean().optional(),
});

export const dropRateSchema = z.object({
  route_name: z.string().trim().min(1).max(200),
  vehicle_name: z.string().trim().min(1).max(200),
  seats: z.number().int().positive().nullable().optional(),
  price: z.number().nonnegative(),
  active: z.boolean().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type CarRentalInput = z.infer<typeof carRentalSchema>;
