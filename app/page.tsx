import { getTrendingItineraries, getApprovedReviews } from "@/lib/supabase/reads";
import { HomeContent } from "@/components/HomeContent";

export default async function HomePage() {
  const [trending, reviews] = await Promise.all([
    getTrendingItineraries(),
    getApprovedReviews(6),
  ]);

  return <HomeContent trending={trending} reviews={reviews} />;
}
