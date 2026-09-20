import { getApprovedReviews } from "@/lib/supabase/reads";
import { ReviewsContent } from "@/components/ReviewsContent";

export default async function ReviewsPage() {
  const reviews = await getApprovedReviews();
  return <ReviewsContent reviews={reviews} />;
}
