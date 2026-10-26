import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Offer = { code: string; description: string | null; discount_type: string; discount_value: number; max_discount: number | null; min_order: number; expires_at: string | null };

/** Live offers the admin marked "show on website" (active, started, not expired, uses left). */
export const offersOptions = queryOptions({
  queryKey: ["public-offers"],
  staleTime: 60_000,
  queryFn: async (): Promise<Offer[]> => {
    const { data, error } = await supabase.rpc("public_offers");
    if (error || !Array.isArray(data)) return [];
    return (data as unknown as Offer[]).map((o) => ({ ...o, discount_value: Number(o.discount_value), max_discount: o.max_discount == null ? null : Number(o.max_discount), min_order: Number(o.min_order) }));
  },
});

export function offerLabel(o: Pick<Offer, "discount_type" | "discount_value" | "max_discount">) {
  return o.discount_type === "percent" ? `${o.discount_value}% off${o.max_discount ? ` · up to ₹${o.max_discount}` : ""}` : `₹${o.discount_value} off`;
}

/** Sends the code to the booking form on the page (or saves it for the booking page). */
export function claimOffer(code: string) {
  try {
    const key = "getxpress_booking_draft_v1";
    const raw = JSON.parse(localStorage.getItem(key) ?? "null");
    if (raw && typeof raw === "object") localStorage.setItem(key, JSON.stringify({ ...raw, coupon: code }));
    sessionStorage.setItem("gx_pending_offer", code);
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent("gx:claim-offer", { detail: code }));
}
