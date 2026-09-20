import { getTrendingItineraries } from "@/lib/supabase/reads";
import { ItinerariesContent } from "@/components/ItinerariesContent";

export default async function ItinerariesPage() {
  const trending = await getTrendingItineraries();
  return <ItinerariesContent trending={trending} />;
}
