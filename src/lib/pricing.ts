export type ServiceLevel = "standard" | "express" | "same_day";

export const services: Record<ServiceLevel, { label: string; eta: string; base: number; perKg: number }> = {
  standard: { label: "Standard", eta: "3–5 business days", base: 49, perKg: 30 },
  express: { label: "Express", eta: "1–2 business days", base: 89, perKg: 55 },
  same_day: { label: "Same day (intra-city)", eta: "Today", base: 149, perKg: 70 },
};

export type Dims = { l: number; w: number; h: number };
export type PieceInput = { weight_kg: number; dims?: Dims | undefined };
export type ServiceRates = Partial<Record<ServiceLevel, { base: number; perKg: number; active?: boolean }>>;
export const boxPresets = [
  { id: "document", label: "Flyer envelope", kind: "documents", maxKg: 0.5, dims: { l: 32, w: 24, h: 1 } },
  { id: "card", label: "Card envelope", kind: "documents", maxKg: 0.5, dims: { l: 12, w: 16.5, h: 1 } },
  { id: "a4", label: "A4 envelope", kind: "documents", maxKg: 0.5, dims: { l: 32, w: 24, h: 1 } },
  { id: "document_pack", label: "Document pack", kind: "documents", maxKg: 0.5, dims: { l: 38, w: 28, h: 2 } },
  { id: "small", label: "Small box", kind: "packages", maxKg: 2, dims: { l: 25, w: 20, h: 10 } },
  { id: "medium", label: "Medium box", kind: "packages", maxKg: 5, dims: { l: 35, w: 25, h: 15 } },
  { id: "large", label: "Large box", kind: "packages", maxKg: 10, dims: { l: 45, w: 35, h: 20 } },
  { id: "extra_large", label: "Extra-large box", kind: "packages", maxKg: 20, dims: { l: 55, w: 45, h: 35 } },
] as const;
export function sameCity(from: string, to: string) { return !!from.trim() && from.trim().toLowerCase() === to.trim().toLowerCase(); }
export function serviceAllowed(service: ServiceLevel, from: string, to: string, rates?: ServiceRates) { return rates?.[service]?.active !== false && (service !== "same_day" || sameCity(from, to)); }

export const volumetric = (d?: Dims) => (d ? (d.l * d.w * d.h) / 5000 : 0);

/** Billable weight = max(actual, volumetric L*W*H/5000), rounded up to 0.5 kg. */
export function billableWeight(actualKg: number, dims?: Dims) {
  const w = Math.max(actualKg, volumetric(dims), 0.5);
  return Math.ceil(w * 2) / 2;
}

/** Shipment billable weight: each parcel billed on max(actual, volumetric), summed, rounded up to 0.5 kg. */
export function piecesBillable(pieces: PieceInput[]) {
  const sum = pieces.reduce((a, p) => a + Math.max(p.weight_kg, volumetric(p.dims)), 0);
  return Math.ceil(Math.max(sum, 0.5) * 2) / 2;
}

/** Zone surcharge from pincode distance: same first 3 digits = local, same first digit = regional, else national. */
export function zoneOf(fromPin: string, toPin: string): "local" | "regional" | "national" {
  if (fromPin.slice(0, 3) === toPin.slice(0, 3)) return "local";
  if (fromPin[0] === toPin[0]) return "regional";
  return "national";
}

const zoneMultiplier = { local: 1, regional: 1.25, national: 1.6 } as const;

export function quote(params: { fromPin: string; toPin: string; weightKg: number; service: ServiceLevel; dims?: Dims | undefined; pieces?: PieceInput[] | undefined; rates?: ServiceRates; extras?: number }) {
  const s = { ...services[params.service], ...params.rates?.[params.service] };
  const weight = params.pieces?.length ? piecesBillable(params.pieces) : billableWeight(params.weightKg, params.dims);
  const zone = zoneOf(params.fromPin, params.toPin);
  const handling = Math.max(0, params.extras ?? 0);
  const freight = (s.base + s.perKg * Math.max(0, weight - 0.5)) * zoneMultiplier[zone] + handling;
  const gst = freight * 0.18;
  return { weight, zone, handling: round(handling), freight: round(freight), gst: round(gst), total: round(freight + gst), eta: s.eta };
}

const round = (n: number) => Math.round(n * 100) / 100;

export type CouponRule = { discount_type: string; discount_value: number; max_discount: number | null; min_order: number };

/** Discount for a coupon on an order total; 0 when the order is below the minimum. */
export function couponDiscount(total: number, c: CouponRule) {
  if (total < c.min_order) return 0;
  let d = c.discount_type === "percent" ? (total * c.discount_value) / 100 : c.discount_value;
  if (c.max_discount != null) d = Math.min(d, c.max_discount);
  return round(Math.min(d, total));
}
