import "server-only";
import { supabasePublic } from "@/lib/supabase-public";

export interface TrendingItinerary {
  id: number;
  title: string;
  duration: string | null;
  short_desc: string | null;
  price_from: string | null;
  details: string | null;
  sort_order: number | null;
  active: boolean;
}

export interface Review {
  id: number;
  name: string;
  rating: number;
  message: string;
  park: string | null;
  approved: boolean;
  created_at: string;
}

export interface Vehicle {
  id: number;
  name: string;
  type: string | null;
  seats: number | null;
  price_per_day: number | null;
  image_url: string | null;
  active: boolean;
  sort_order: number | null;
}

export interface DropRoutePrice {
  id: number;
  route_name: string;
  vehicle_name: string;
  seats: number | null;
  price: number;
  sort_order: number;
  active: boolean;
}

/** All reads below are Server Component-only, using the anon key (RLS-protected). */

export async function getTrendingItineraries(): Promise<TrendingItinerary[]> {
  try {
    const sb = supabasePublic();
    const { data, error } = await sb
      .from("trending_itineraries")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) {
      console.warn("getTrendingItineraries failed:", error.message);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.warn("getTrendingItineraries threw:", e);
    return [];
  }
}

export async function getApprovedReviews(limit?: number): Promise<Review[]> {
  try {
    const sb = supabasePublic();
    let query = sb
      .from("reviews")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false });
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) {
      console.warn("getApprovedReviews failed:", error.message);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.warn("getApprovedReviews threw:", e);
    return [];
  }
}

export async function getActiveVehicles(): Promise<Vehicle[]> {
  try {
    const sb = supabasePublic();
    const { data, error } = await sb
      .from("vehicles")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) {
      console.warn("getActiveVehicles failed:", error.message);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.warn("getActiveVehicles threw:", e);
    return [];
  }
}

export async function getDropRoutePrices(): Promise<DropRoutePrice[]> {
  try {
    const sb = supabasePublic();
    const { data, error } = await sb
      .from("drop_route_prices")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) {
      console.warn("getDropRoutePrices failed:", error.message);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.warn("getDropRoutePrices threw:", e);
    return [];
  }
}
