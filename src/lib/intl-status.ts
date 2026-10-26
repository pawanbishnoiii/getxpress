/** International quote → booking → delivery stages, shared by tracking, dashboards and admin. */
export const QUOTE_STATUSES = ["pending", "reviewing", "quoted", "booking_requested", "booked", "picked_up", "in_transit", "customs", "out_for_delivery", "delivered", "cancelled"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STEPS = [
  { label: "Request received", states: ["pending", "new"] },
  { label: "Price shared", states: ["reviewing", "quoted"] },
  { label: "Booking form", states: ["booking_requested"] },
  { label: "Booked & picked up", states: ["booked", "picked_up"] },
  { label: "In transit / customs", states: ["in_transit", "customs", "out_for_delivery"] },
  { label: "Delivered", states: ["delivered"] },
] as const;

export function quoteStepIndex(status: string) {
  const i = QUOTE_STEPS.findIndex((s) => (s.states as readonly string[]).includes(status));
  return i < 0 ? 0 : i;
}

/** Quote references look like GXI1A2B3C4D (or older GXQ-…); AWBs are GX followed by digits. */
export function isQuoteRef(id: string) { return /^GX(I|Q-?)[A-Z0-9]/i.test(id.trim()); }

/** Customer can still fill the booking form for these statuses. */
export const BOOKABLE = ["pending", "new", "reviewing", "quoted"];
