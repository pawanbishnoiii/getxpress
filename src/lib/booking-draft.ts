import { z } from "zod";
export const DRAFT_KEY = "getxpress_booking_draft_v1";
const party = z.object({
  name: z.string(),
  phone: z.string(),
  address: z.string(),
  pincode: z.string(),
  city: z.string(),
  house: z.string().default(""),
  street: z.string().default(""),
  landmark: z.string().default(""),
  district: z.string().default(""),
  state: z.string().default(""),
  email: z.string().default(""),
  alternate_phone: z.string().default(""),
  country: z.literal("India").default("India"),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
const piece = z.object({
  id: z.string(),
  preset: z.string(),
  kind: z.enum(["documents", "packages"]),
  weight_kg: z.number(),
  dims: z.object({ l: z.number(), w: z.number(), h: z.number() }),
});
export const draftSchema = z.object({
  sender: party,
  receiver: party,
  billing_same_as_delivery: z.boolean().default(true),
  billing: party.optional(),
  pieces: z.array(piece).min(1).max(50),
  service: z.enum(["standard", "express", "same_day"]),
  contents: z.string(),
  declared_value: z.number(),
  coupon: z.string(),
  payment_method: z.enum(["cash_on_pickup", "online", "wallet"]),
  step: z.number().min(0).max(3),
  is_fragile: z.boolean().default(false),
  has_electronics: z.boolean().default(false),
  policy_accepted: z.boolean().default(false),
});
export type BookingDraft = z.infer<typeof draftSchema>;
export const emptyParty = {
  name: "",
  phone: "",
  address: "",
  pincode: "",
  city: "",
  house: "",
  street: "",
  landmark: "",
  district: "",
  state: "",
  email: "",
  alternate_phone: "",
  country: "India" as const,
};
/** One-line address in rider order: house, street, city, near landmark, district, state, PIN. */
export function composeAddress(p: {
  house?: string;
  street?: string;
  city?: string;
  landmark?: string;
  district?: string;
  state?: string;
  pincode?: string;
}) {
  return [
    p.house,
    p.street,
    p.city,
    p.landmark ? `near ${p.landmark}` : "",
    p.district && p.district !== p.city ? p.district : "",
    p.state,
    p.pincode,
  ]
    .map((x) => (x ?? "").trim())
    .filter(Boolean)
    .join(", ");
}
/**
 * The preview/HTTP deployment is not a secure context, so some browsers
 * expose crypto but omit randomUUID(). Keep draft IDs local-only and provide
 * a deterministic-safe fallback instead of crashing the whole landing route.
 */
function draftId() {
  const uuid = globalThis.crypto?.randomUUID;
  if (typeof uuid === "function") return uuid.call(globalThis.crypto);
  return `piece-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function newPiece() {
  return {
    id: draftId(),
    preset: "small",
    kind: "packages" as const,
    weight_kg: 1,
    dims: { l: 25, w: 20, h: 10 },
  };
}
export function initialDraft(): BookingDraft {
  return {
    sender: { ...emptyParty },
    receiver: { ...emptyParty },
    billing_same_as_delivery: true,
    pieces: [newPiece()],
    service: "standard",
    contents: "",
    declared_value: 0,
    coupon: "",
    payment_method: "cash_on_pickup",
    step: 0,
    is_fragile: false,
    has_electronics: false,
    policy_accepted: false,
  };
}
/** Reads a saved draft; merges onto a fresh draft so one outdated field never wipes what the guest typed. */
export function readDraft(storage: Pick<Storage, "getItem">): BookingDraft | null {
  try {
    const raw = JSON.parse(storage.getItem(DRAFT_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return null;
    const strict = draftSchema.safeParse(raw);
    if (strict.success) return strict.data;
    const base = initialDraft();
    const fixParty = (p: unknown) => {
      const o = { ...emptyParty, ...(p && typeof p === "object" ? p : {}) } as Record<
        string,
        unknown
      >;
      for (const k of Object.keys(emptyParty))
        if (typeof o[k] !== "string") o[k] = (emptyParty as Record<string, string>)[k];
      o["country"] = "India";
      return o;
    };
    const merged = {
      ...base,
      ...raw,
      sender: fixParty(raw.sender),
      receiver: fixParty(raw.receiver),
      billing: raw.billing ? fixParty(raw.billing) : undefined,
      pieces: Array.isArray(raw.pieces) && raw.pieces.length ? raw.pieces : base.pieces,
      step: Math.min(3, Math.max(0, Number(raw.step) || 0)),
    };
    const r = draftSchema.safeParse(merged);
    if (r.success) return r.data;
    return {
      ...base,
      sender: draftSchema.shape.sender.safeParse(merged.sender).data ?? base.sender,
      receiver: draftSchema.shape.receiver.safeParse(merged.receiver).data ?? base.receiver,
    };
  } catch {
    return null;
  }
}
export function saveDraft(storage: Pick<Storage, "setItem">, draft: BookingDraft) {
  storage.setItem(DRAFT_KEY, JSON.stringify(draftSchema.parse(draft)));
}
