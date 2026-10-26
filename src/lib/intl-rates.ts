// Pure pricing helpers for international pickup-service rates (rate card values are ₹ per kg).
export type CountryRates = { zones: "state" | "fsa" | "postcode" | null; rates: Record<string, Record<string, number>>; map?: Record<string, string> };
export type RateCard = Record<string, CountryRates>;
export type Item = { name: string; qty: number; weight: number; value: number };

export function zoneFor(c: CountryRates, postal: string): string | null {
  if (!c.zones) return "_";
  const p = postal.trim();
  if (!p) return null;
  if (c.zones === "fsa") return c.map?.[p.replace(/\s/g, "").slice(0, 3).toUpperCase()] ?? null;
  if (c.zones === "postcode") return c.map?.[p.replace(/\D/g, "").padStart(4, "0").slice(0, 4)] ?? null;
  return c.map?.[p.toUpperCase()] ?? c.map?.[p.toLowerCase()] ?? null;
}

/** Chargeable weight rounds up to whole kg and never goes below the card's first slab. */
export function chargeableKg(actual: number, table: Record<string, number>) {
  const slabs = Object.keys(table).map(Number).sort((a, b) => a - b);
  return Math.max(slabs[0] ?? 1, Math.ceil(actual));
}

export function basePrice(table: Record<string, number>, kg: number) {
  const slabs = Object.keys(table).map(Number).sort((a, b) => a - b);
  const slab = [...slabs].reverse().find((s) => s <= kg) ?? slabs[0]!;
  return Math.round(table[String(slab)]! * kg);
}

/** Customer price = base + hidden admin markup (percent + flat). */
export function withMarkup(base: number, percent: number, flat: number) {
  return Math.max(0, Math.round(base * (1 + percent / 100) + flat));
}

/** Admin picks exactly one: add a margin (+%) or give a discount (−%). */
export type AdjustMode = "markup" | "discount";
export const MAX_MARKUP_PCT = 200, MAX_DISCOUNT_PCT = 90;
export function toSignedPercent(mode: AdjustMode, value: number) {
  const v = Math.abs(Number.isFinite(value) ? value : 0);
  return mode === "discount" ? -Math.min(MAX_DISCOUNT_PCT, v) : Math.min(MAX_MARKUP_PCT, v);
}
export function fromSignedPercent(percent: number): { mode: AdjustMode; value: number } {
  return { mode: percent < 0 ? "discount" : "markup", value: Math.abs(percent) };
}
