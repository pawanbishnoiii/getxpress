// Browser-only label builder. IDs always come from saved database records.
import { brand, publicBaseUrl } from "./brand";

export type LabelShipment = {
  tracking_number: string;
  service: string;
  created_at: string;
  weight_kg: number;
  price: number;
  payment_method: string;
  sender_name: string; sender_city: string; sender_pincode: string; sender_phone: string;
  receiver_name: string; receiver_address: string; receiver_city: string; receiver_pincode: string; receiver_phone: string;
};
export type LabelPiece = { piece_code: string; seq_no: number; total: number; weight_kg: number | null };

async function code128(text: string, includetext = true) {
  const bwip = await import("bwip-js/browser");
  const canvas = document.createElement("canvas");
  bwip.toCanvas(canvas, { bcid: "code128", text, scale: 3, height: 14, includetext, textxalign: "center" });
  return { url: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height };
}
async function qr(text: string) {
  const QR = await import("qrcode");
  return QR.toDataURL(text, { margin: 0, width: 300, errorCorrectionLevel: "M" });
}

export const trackUrl = (code: string) => `${publicBaseUrl()}/track?id=${encodeURIComponent(code)}`;

type Doc = import("jspdf").jsPDF;

/** Draws one label in a w×h mm box (designed at 100×150). */
async function drawLabel(doc: Doc, s: LabelShipment, p: LabelPiece, x: number, y: number, w: number, h: number) {
  const k = Math.min(w / 100, h / 150);
  const X = (v: number) => x + v * k;
  const Y = (v: number) => y + v * k;
  const fs = (v: number) => doc.setFontSize(v * k);
  doc.setDrawColor(0); doc.setLineWidth(0.4 * k);
  doc.rect(X(2), Y(2), 96 * k, 146 * k);
  // Header
  doc.setFillColor(0, 0, 0); doc.rect(X(2), Y(2), 96 * k, 12 * k, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); fs(16);
  doc.text(brand.name.toUpperCase(), X(5), Y(10.5));
  fs(9); doc.text(`${s.service.replace("_", " ").toUpperCase()} · ${p.seq_no} of ${p.total}`, X(95), Y(10.5), { align: "right" });
  doc.setTextColor(0);
  // Master AWB barcode
  fs(7); doc.setFont("helvetica", "normal"); doc.text("MASTER AWB", X(5), Y(19));
  const awb = await code128(s.tracking_number);
  doc.addImage(awb.url, "PNG", X(5), Y(20), 90 * k, 20 * k);
  // Destination block
  doc.line(X(2), Y(43), X(98), Y(43));
  fs(7); doc.text("DELIVER TO", X(5), Y(48));
  doc.setFont("helvetica", "bold"); fs(11); doc.text(s.receiver_name.slice(0, 34), X(5), Y(53));
  doc.setFont("helvetica", "normal"); fs(8);
  const addr = doc.splitTextToSize(s.receiver_address, 60 * k).slice(0, 3) as string[];
  doc.text(addr, X(5), Y(58));
  doc.setFont("helvetica", "bold"); fs(13);
  doc.text(`${s.receiver_city.slice(0, 20)} - ${s.receiver_pincode}`, X(5), Y(73));
  doc.setFont("helvetica", "normal"); fs(8); doc.text(`Ph: ${s.receiver_phone}`, X(5), Y(78));
  const q = await qr(trackUrl(p.piece_code));
  doc.addImage(q, "PNG", X(68), Y(46), 28 * k, 28 * k);
  // From block
  doc.line(X(2), Y(82), X(98), Y(82));
  fs(7); doc.text("FROM", X(5), Y(87));
  fs(8); doc.text(`${s.sender_name.slice(0, 30)}, ${s.sender_city} - ${s.sender_pincode}`, X(5), Y(91));
  doc.text(`Ph: ${s.sender_phone}`, X(5), Y(95));
  doc.text(`Wt: ${p.weight_kg ?? s.weight_kg} kg · ${s.payment_method === "online" ? "PREPAID" : `COLLECT ₹${s.price}`.replace("₹", "Rs ")}`, X(95), Y(95), { align: "right" });
  // Piece barcode
  doc.line(X(2), Y(99), X(98), Y(99));
  fs(7); doc.text(`PIECE ID · PARCEL ${p.seq_no} OF ${p.total}`, X(5), Y(104));
  const pc = await code128(p.piece_code);
  doc.addImage(pc.url, "PNG", X(5), Y(106), 90 * k, 26 * k);
  fs(6.5);
  doc.text(`Booked ${new Date(s.created_at).toLocaleDateString("en-IN")} · Scan QR or visit ${publicBaseUrl().replace(/^https?:\/\//, "")}/track`, X(50), Y(141), { align: "center" });
}

export type LabelLayout = { id: string; label: string; hint: string; page: [number, number]; cols: number; rows: number; recommended?: boolean };
/** Print formats. All sizes in mm; each label is scaled to fit its cell. */
export const LABEL_LAYOUTS: LabelLayout[] = [
  { id: "thermal", label: "4×6 in thermal", hint: "100×150 mm · courier standard", page: [101.6, 152.4], cols: 1, rows: 1, recommended: true },
  { id: "thermal4x4", label: "4×4 in thermal", hint: "100×100 mm · small parcels", page: [101.6, 101.6], cols: 1, rows: 1 },
  { id: "a4", label: "A4 · 4 per page", hint: "Normal office printer", page: [210, 297], cols: 2, rows: 2 },
  { id: "a4x2", label: "A4 · 2 per page", hint: "Bigger, easy to read", page: [210, 297], cols: 1, rows: 2 },
  { id: "a4x1", label: "A4 · 1 per page", hint: "Large boxes", page: [210, 297], cols: 1, rows: 1 },
];

export async function buildLabelsPdf(s: LabelShipment, pieces: LabelPiece[], layout: string | LabelLayout) {
  const { jsPDF } = await import("jspdf");
  const L = typeof layout === "string" ? (LABEL_LAYOUTS.find((x) => x.id === layout) ?? LABEL_LAYOUTS[0]!) : layout;
  const [pw, ph] = L.page;
  const doc = new jsPDF({ unit: "mm", format: [pw, ph], orientation: pw > ph ? "landscape" : "portrait" });
  const margin = L.cols * L.rows > 1 || pw > 120 ? 5 : 0.8;
  const cw = (pw - margin * 2) / L.cols, ch = (ph - margin * 2) / L.rows;
  const per = L.cols * L.rows;
  for (const [i, p] of pieces.entries()) {
    if (i && i % per === 0) doc.addPage([pw, ph], pw > ph ? "landscape" : "portrait");
    const slot = i % per;
    const k = Math.min(cw / 100, ch / 150);
    const lw = 100 * k, lh = 150 * k;
    const x = margin + (slot % L.cols) * cw + (cw - lw) / 2;
    const y = margin + Math.floor(slot / L.cols) * ch + (ch - lh) / 2;
    await drawLabel(doc, s, p, x, y, lw, lh);
  }
  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export type CodeStyle = "barcode" | "number" | "both" | "qr";
export type CodeSheet = { id: string; label: string; page: [number, number]; cols: number; rows: number };
export const CODE_SHEETS: CodeSheet[] = [
  { id: "a4_24", label: "A4 · 24 stickers (3×8)", page: [210, 297], cols: 3, rows: 8 },
  { id: "a4_40", label: "A4 · 40 small stickers (4×10)", page: [210, 297], cols: 4, rows: 10 },
  { id: "roll_50x25", label: "Thermal roll 50×25 mm", page: [50, 25], cols: 1, rows: 1 },
  { id: "roll_75x50", label: "Thermal roll 75×50 mm", page: [75, 50], cols: 1, rows: 1 },
];

/** Barcode sticker sheets for seal tags, plastic bags or any code. Style picks barcode, plain number, both or QR. */
export async function buildCodeSheetPdf(codes: string[], title: string, opts: { style?: CodeStyle; sheet?: string } = {}) {
  const { jsPDF } = await import("jspdf");
  const style = opts.style ?? "both";
  const S = CODE_SHEETS.find((x) => x.id === opts.sheet) ?? CODE_SHEETS[0]!;
  const [pw, ph] = S.page;
  const roll = S.cols * S.rows === 1;
  const orient = pw > ph ? "landscape" : "portrait";
  const doc = new jsPDF({ unit: "mm", format: [pw, ph], orientation: orient });
  const mx = roll ? 1 : 6, my = roll ? 1 : 12;
  const w = (pw - mx * 2) / S.cols, h = (ph - my - (roll ? 1 : 6)) / S.rows;
  const per = S.cols * S.rows;
  for (let i = 0; i < codes.length; i++) {
    const slot = i % per;
    if (i > 0 && slot === 0) doc.addPage([pw, ph], orient);
    if (slot === 0 && !roll) { doc.setFontSize(8); doc.text(`${brand.name} · ${title}`, mx, 7); }
    const x = mx + (slot % S.cols) * w, y = my + Math.floor(slot / S.cols) * h;
    const code = codes[i]!;
    if (!roll) { doc.setDrawColor(200); doc.rect(x + 0.5, y + 0.5, w - 1, h - 1); }
    const pad = 2, small = Math.max(5, Math.min(8, h / 4));
    if (style === "number") {
      doc.setFont("courier", "bold"); doc.setFontSize(Math.min(18, w / (code.length * 0.45)));
      doc.text(code, x + w / 2, y + h / 2 + 1, { align: "center" });
    } else if (style === "qr") {
      const s = Math.min(h - small - pad * 2, w - pad * 2);
      doc.addImage(await qr(code), "PNG", x + (w - s) / 2, y + pad, s, s);
      doc.setFont("courier", "bold"); doc.setFontSize(small); doc.text(code, x + w / 2, y + h - 1.5, { align: "center" });
    } else {
      const b = await code128(code, style === "both");
      const bw = w - pad * 2, bh = Math.min(h - (style === "both" ? small : 0) - pad * 2, (bw * b.h) / b.w);
      doc.addImage(b.url, "PNG", x + pad, y + pad, bw, bh);
    }
    doc.setFont("helvetica", "normal"); doc.setFontSize(Math.max(4, small - 2));
    if (style !== "qr") doc.text(title, x + w / 2, y + h - 1.2, { align: "center" });
  }
  return doc.output("blob");
}

export type BagLabel = { bag_code: string; destination: string; seal_no: string | null; plastic_bag_code: string | null; created_at: string; pieces: { piece_code: string; tracking_number?: string | null }[] };

/** 100×150 mm hub bag label: bag barcode, QR, destination and list of parcels in the bag. */
export async function buildBagLabelPdf(bag: BagLabel) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: [100, 150] });
  doc.setFillColor(0, 0, 0); doc.rect(2, 2, 96, 12, "F");
  doc.setTextColor(255); doc.setFontSize(13); doc.text(`${brand.name} · HUB BAG`, 5, 10);
  doc.setTextColor(0);
  const b = await code128(bag.bag_code);
  doc.addImage(b.url, "PNG", 5, 17, 62, Math.min(22, (62 * b.h) / b.w));
  doc.addImage(await qr(trackUrl(bag.bag_code)), "PNG", 72, 16, 24, 24);
  doc.setFontSize(9);
  doc.text(`To: ${bag.destination}`, 5, 46);
  doc.text(`Seal: ${bag.seal_no ?? "—"}   Plastic: ${bag.plastic_bag_code ?? "—"}`, 5, 51);
  doc.text(`Created: ${new Date(bag.created_at).toLocaleString("en-IN")}   Parcels: ${bag.pieces.length}`, 5, 56);
  doc.line(5, 59, 95, 59);
  doc.setFontSize(7.5);
  bag.pieces.slice(0, 40).forEach((p, i) => {
    const x = i < 20 ? 5 : 52, y = 64 + (i % 20) * 4.1;
    doc.text(`${i + 1}. ${p.piece_code}${p.tracking_number ? ` (${p.tracking_number})` : ""}`, x, y);
  });
  if (bag.pieces.length > 40) doc.text(`+ ${bag.pieces.length - 40} more parcels — see manifest`, 5, 147);
  return doc.output("blob");
}
