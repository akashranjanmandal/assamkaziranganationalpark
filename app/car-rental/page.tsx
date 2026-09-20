import { getActiveVehicles, getDropRoutePrices } from "@/lib/supabase/reads";
import { CarRentalContent } from "@/components/CarRentalContent";

export default async function CarRentalPage() {
  const [vehicles, dropRates] = await Promise.all([getActiveVehicles(), getDropRoutePrices()]);
  return <CarRentalContent vehicles={vehicles} dropRates={dropRates} />;
}
