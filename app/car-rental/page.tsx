import { getActiveVehicles, getDropRoutePrices } from "@/lib/supabase/reads";
import { CarRentalForm } from "@/components/CarRentalForm";

export default async function CarRentalPage() {
  const [vehicles, dropRates] = await Promise.all([getActiveVehicles(), getDropRoutePrices()]);

  const routeGroups = dropRates.reduce<Record<string, typeof dropRates>>((acc, r) => {
    (acc[r.route_name] ||= []).push(r);
    return acc;
  }, {});

  return (
    <>
      <section style={{ paddingTop: "10rem", textAlign: "center" }}>
        <span className="section-label">Local &amp; Outstation</span>
        <h1 className="section-title">CAR RENTAL</h1>
        <p style={{ color: "var(--forest-mid)", maxWidth: 700, margin: "0 auto", fontSize: "1.05rem" }}>
          Premium SUV and 4x4 vehicles for all terrains across North-East India, with professional drivers who know
          the local roads.
        </p>
      </section>

      {vehicles.length > 0 && (
        <section>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span className="section-label">Fleet</span>
            <h2 className="section-title">AVAILABLE VEHICLES</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "2rem", maxWidth: 1300, margin: "0 auto" }}>
            {vehicles.map((v) => (
              <div key={v.id} style={{ background: "var(--pure-white)", boxShadow: "var(--shadow-premium)", padding: "1.8rem" }}>
                {v.image_url && (
                  <div style={{ height: 160, backgroundSize: "cover", backgroundPosition: "center", backgroundImage: `url('${v.image_url}')`, marginBottom: "1rem" }} />
                )}
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem" }}>{v.name}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--forest-mid)", marginBottom: "0.6rem" }}>
                  {v.type || "Vehicle"} {v.seats ? `· ${v.seats} seater` : ""}
                </div>
                {v.price_per_day && (
                  <div style={{ fontWeight: 700, color: "var(--gold)" }}>₹{v.price_per_day.toLocaleString()} / day</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {Object.keys(routeGroups).length > 0 && (
        <section style={{ background: "var(--off-white)" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span className="section-label">Fixed Drop Rates</span>
            <h2 className="section-title">ONE-WAY TRANSFERS</h2>
          </div>
          <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gap: "2rem" }}>
            {Object.entries(routeGroups).map(([route, rates]) => (
              <div key={route} style={{ background: "var(--pure-white)", boxShadow: "var(--shadow-premium)", padding: "1.8rem" }}>
                <div style={{ fontWeight: 700, marginBottom: "1rem" }}>{route}</div>
                <div style={{ display: "grid", gap: "0.6rem" }}>
                  {rates
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((r) => (
                      <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", borderBottom: "1px solid var(--off-white)", paddingBottom: "0.5rem" }}>
                        <span>
                          {r.vehicle_name} {r.seats ? `(${r.seats} seater)` : ""}
                        </span>
                        <strong style={{ color: "var(--gold)" }}>₹{r.price.toLocaleString()}</strong>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span className="section-label">Enquire</span>
          <h2 className="section-title">REQUEST A VEHICLE</h2>
        </div>
        <CarRentalForm vehicles={vehicles} />
      </section>
    </>
  );
}
