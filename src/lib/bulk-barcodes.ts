export type ItemType = "seal" | "bag" | "envelope" | "parcel";
export type Symbology = "code128" | "qrcode" | "datamatrix";
export type LayoutId = "thermal-50x25" | "thermal-4x6" | "a4-24" | "a4-40";

export const ITEM_TYPES: Record<ItemType, { label: string; prefix: string }> = {
  seal: { label: "Tamper seal", prefix: "SEAL" },
  bag: { label: "Plastic bag", prefix: "BAG" },
  envelope: { label: "Envelope", prefix: "ENV" },
  parcel: { label: "Parcel label", prefix: "GXP" },
};

export const LAYOUTS: Record<LayoutId, { label: string; page: string; margin: string; cols: number; cellH: string }> = {
  "thermal-50x25": { label: "Thermal sticker 50×25 mm", page: "50mm 25mm", margin: "1mm", cols: 1, cellH: "23mm" },
  "thermal-4x6": { label: "Thermal 4×6 in", page: "4in 6in", margin: "4mm", cols: 1, cellH: "5.6in" },
  "a4-24": { label: "A4 sheet · 24 stickers (3×8)", page: "A4", margin: "8mm", cols: 3, cellH: "34mm" },
  "a4-40": { label: "A4 sheet · 40 stickers (4×10)", page: "A4", margin: "6mm", cols: 4, cellH: "27mm" },
};

const ALPHA = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O to avoid misreads

/** Mod-34 weighted check character, so a single mistyped character is caught. */
export function checkChar(body: string) {
  let sum = 0;
  for (let i = 0; i < body.length; i++) { const v = ALPHA.indexOf(body[i]!); sum += (v < 0 ? body.charCodeAt(i) : v) * (i + 1); }
  return ALPHA[sum % ALPHA.length]!;
}

export function isValidCode(code: string) {
  const c = code.replace(/-/g, "");
  return c.length > 1 && checkChar(c.slice(0, -1)) === c.slice(-1);
}

/** Unique bulk codes: PREFIX-YYMM[-BATCH]-SERIAL+CHECK, with a random 6-char serial per item. */
export function makeCodes(type: ItemType, qty: number, batch = "", now = new Date(), rand: () => number = Math.random) {
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const head = [ITEM_TYPES[type].prefix, yymm, batch].filter(Boolean).join("-");
  const seen = new Set<string>();
  while (seen.size < qty) {
    let serial = "";
    for (let i = 0; i < 6; i++) serial += ALPHA[Math.floor(rand() * ALPHA.length)];
    seen.add(`${head}-${serial}${checkChar((head + serial).replace(/-/g, ""))}`);
  }
  return [...seen];
}
