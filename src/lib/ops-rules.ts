/** Rule-based (no AI) helpers for parcel exceptions and booking risk scoring. */

export type ExceptionClass = { category: string; severity: "low" | "medium" | "high"; action: string };

const RULES: { category: string; severity: ExceptionClass["severity"]; words: string[]; action: string }[] = [
  { category: "Damaged parcel", severity: "high", words: ["damage", "broken", "torn", "leak", "wet", "crushed", "toota", "phata"], action: "Photograph the parcel, hold it at hub and inform the sender before moving it." },
  { category: "Address issue", severity: "medium", words: ["address", "wrong address", "incomplete", "not found", "galat", "pata"], action: "Call the receiver to confirm the address, then reattempt delivery." },
  { category: "Receiver unavailable", severity: "medium", words: ["not available", "unavailable", "no answer", "phone off", "locked", "ghar par nahi", "not reachable"], action: "Schedule a reattempt for the next slot and send an SMS/WhatsApp to the receiver." },
  { category: "Refused by receiver", severity: "medium", words: ["refused", "reject", "denied", "mana", "cancel"], action: "Mark for return to origin (RTO) and notify the sender." },
  { category: "Missing / short", severity: "high", words: ["missing", "lost", "short", "not received", "gayab"], action: "Raise an investigation, check the last bag/manifest scan and escalate to the area manager." },
  { category: "Label problem", severity: "low", words: ["label", "barcode", "unreadable", "smudged", "no label"], action: "Reprint the label with a reason and rescan the piece." },
  { category: "Delay / misroute", severity: "medium", words: ["delay", "late", "misroute", "wrong hub", "stuck"], action: "Re-bag to the correct destination hub on the next manifest." },
];

export function classifyException(text: string): ExceptionClass {
  const t = text.toLowerCase();
  let best: (typeof RULES)[number] | null = null;
  let hits = 0;
  for (const r of RULES) {
    const n = r.words.filter((w) => t.includes(w)).length;
    if (n > hits) { hits = n; best = r; }
  }
  if (!best) return { category: "Other", severity: "low", action: "Add more detail and escalate to the hub manager for review." };
  return { category: best.category, severity: best.severity, action: best.action };
}

export type BookingScoreInput = {
  weight_kg: number; pieces_count: number; declared_value: number | null; payment_method: string;
  serviceable: boolean; same_city: boolean; receiver_phone: string; receiver_address: string;
};

/** 0–100, higher = smoother booking. Returns the score and the main reason. */
export function scoreBooking(b: BookingScoreInput): { score: number; reason: string } {
  let score = 100;
  const reasons: [number, string][] = [];
  const hit = (n: number, r: string) => { score -= n; reasons.push([n, r]); };
  if (!b.serviceable) hit(40, "Destination pincode not serviceable");
  if (b.receiver_address.trim().length < 15) hit(15, "Receiver address looks incomplete");
  if (!/^(\+91)?[6-9]\d{9}$/.test(b.receiver_phone.replace(/\s/g, ""))) hit(15, "Receiver phone looks invalid");
  if (b.weight_kg > 20) hit(15, "Heavy parcel (over 20 kg)");
  if ((b.declared_value ?? 0) > 25000) hit(10, "High declared value");
  if (b.pieces_count > 5) hit(5, "Many pieces in one booking");
  if (b.payment_method === "cash_on_pickup") hit(5, "Payment collected at pickup");
  score = Math.max(0, score);
  reasons.sort((a, b2) => b2[0] - a[0]);
  return { score, reason: reasons[0]?.[1] ?? (b.same_city ? "Clean intra-city booking" : "All checks passed") };
}
