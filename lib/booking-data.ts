export type ParkKey = "kaziranga" | "manas";

export const PARK_INFO: Record<ParkKey, { label: string; price: number; jeepPrice: number; image: string; tag: string }> = {
  kaziranga: {
    label: "Kaziranga",
    price: 1000,
    jeepPrice: 3500,
    image: "/images/kazi.jpg",
    tag: "UNESCO Stronghold · Central Range",
  },
  manas: {
    label: "Manas",
    price: 1300,
    jeepPrice: 4500,
    image: "/images/manas.jpg",
    tag: "Biosphere Reserve · Bansbari Range",
  },
};

/** Ported from booking.html's calcTotal(). */
export function calcTotal(park: ParkKey, adultCount: number): number {
  const cfg = PARK_INFO[park];
  if (!cfg) return 0;
  if (adultCount <= 3) return adultCount * cfg.price;
  if (adultCount <= 6) return cfg.jeepPrice;
  return cfg.jeepPrice + (adultCount - 6) * cfg.price;
}

export interface TimeSlot {
  id: string;
  name: string;
  time: string;
}

export function getParkSlots(park: ParkKey): TimeSlot[] {
  if (park === "kaziranga") {
    return [
      { id: "kazi-morn", name: "Morning", time: "9:00 AM – 11:00 AM" },
      { id: "kazi-eve", name: "Afternoon", time: "2:00 PM – 4:00 PM" },
    ];
  }
  return [
    { id: "manas-morn", name: "Morning", time: "8:00 AM – 12:00 PM" },
    { id: "manas-eve", name: "Afternoon", time: "2:00 PM – 4:00 PM" },
  ];
}

/** Manas Bansbari Range is closed every Tuesday. */
export function isClosedDate(park: ParkKey, dateStr: string): boolean {
  if (!dateStr) return false;
  if (park !== "manas") return false;
  const d = new Date(dateStr + "T00:00:00");
  return d.getDay() === 2; // Tuesday
}

export function getParkRules(park: ParkKey): string[] {
  const common = [
    "Children above 5 years are chargeable as adults.",
    "No single-use plastic allowed inside the park.",
    "Still camera charges are payable at the park gate directly.",
    park === "kaziranga"
      ? "Video camera charges apply extra at the Kaziranga gate."
      : "Video camera charges apply extra at the Manas gate.",
    "Carry a valid original photo ID for all guests.",
    "Please be ready at the pickup point 30 minutes before your slot.",
    "Vehicle & driver details are shared via WhatsApp 24 hours before the safari.",
    "Aadhaar upload of the primary guest is required at the time of booking.",
  ];
  if (park === "manas") {
    common.splice(4, 0, "Manas Bansbari Range is closed every Tuesday.", "Foreign nationals require prior permission — contact us before booking.");
  }
  return common;
}

export interface GuestInfo {
  name: string;
  age: string;
  contact: string;
  aadhaarKey?: string | null;
}
