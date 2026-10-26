import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Printer, RefreshCw } from "lucide-react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/hooks/use-roles";
import { ITEM_TYPES, LAYOUTS, makeCodes, type ItemType, type LayoutId, type Symbology } from "@/lib/bulk-barcodes";

export const Route = createFileRoute("/_authenticated/admin/barcode")({
  head: () => ({ meta: [
    { title: "Bulk barcode generator — GetXpress Admin" },
    { name: "description", content: "Generate seal, plastic bag, envelope and parcel barcodes in bulk and print them in thermal or A4 formats." },
    { property: "og:title", content: "GetXpress bulk barcodes" },
    { property: "og:description", content: "Bulk barcodes for seals, bags, envelopes and parcels." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: BarcodePage,
});

const field = "mt-1 h-11 w-full rounded-md border bg-background px-3 text-sm";

function BarcodePage() {
  const { isAdmin } = useRoles();
  const [type, setType] = useState<ItemType>("seal");
  const [qty, setQty] = useState(24);
  const [sym, setSym] = useState<Symbology>("code128");
  const [layout, setLayout] = useState<LayoutId>("a4-24");
  const [batch, setBatch] = useState("");
  const [seed, setSeed] = useState(0);
  const [svgs, setSvgs] = useState<string[]>([]);
  const codes = useMemo(() => makeCodes(type, Math.min(Math.max(qty, 1), 500), batch), [type, qty, batch, seed]);
  useEffect(() => {
    let live = true;
    void (async () => {
      const bwip = await import("bwip-js/browser");
      const out = codes.map((text) => bwip.toSVG(sym === "qrcode"
        ? { bcid: "qrcode", text, scale: 3 }
        : sym === "datamatrix" ? { bcid: "datamatrix", text, scale: 3 }
        : { bcid: "code128", text, scale: 2, height: 10, includetext: true, textxalign: "center" }));
      if (live) setSvgs(out);
    })();
    return () => { live = false; };
  }, [codes, sym]);
  if (!isAdmin) return <AppShell><p>Admin access required.</p></AppShell>;
  const L = LAYOUTS[layout];
  const t = ITEM_TYPES[type];
  const csv = () => {
    const blob = new Blob(["code,type\n" + codes.map((c) => `${c},${t.label}`).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${t.prefix}-${codes.length}.csv`; a.click();
  };
  return (
    <AppShell wide>
      <div className="print:hidden">
        <PageHeader title="Bulk barcodes" sub="Seals, plastic bags, envelopes and parcel labels — generate, print, done" />
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(ITEM_TYPES) as ItemType[]).map((k) => (
            <button key={k} onClick={() => setType(k)} className={`rounded-xl border p-4 text-left ${type === k ? "border-primary bg-primary/10" : "bg-card"}`}>
              <b className="block">{ITEM_TYPES[k].label}</b><span className="font-mono text-xs text-muted-foreground">{ITEM_TYPES[k].prefix}-YYMM-…</span>
            </button>))}
        </div>
        <div className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-5">
          <label className="text-sm font-semibold">Quantity<input type="number" min={1} max={500} value={qty} onChange={(e) => setQty(Number(e.target.value))} className={field} /></label>
          <label className="text-sm font-semibold">Barcode type<select value={sym} onChange={(e) => setSym(e.target.value as Symbology)} className={field}><option value="code128">Code 128 (scanner)</option><option value="qrcode">QR code (phone)</option><option value="datamatrix">Data Matrix (small)</option></select></label>
          <label className="text-sm font-semibold">Print format<select value={layout} onChange={(e) => setLayout(e.target.value as LayoutId)} className={field}>{(Object.keys(LAYOUTS) as LayoutId[]).map((k) => <option key={k} value={k}>{LAYOUTS[k].label}</option>)}</select></label>
          <label className="text-sm font-semibold">Batch / hub code (optional)<input value={batch} maxLength={6} onChange={(e) => setBatch(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="JPR01" className={field} /></label>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="icon" aria-label="New serials" onClick={() => setSeed((s) => s + 1)}><RefreshCw /></Button>
            <Button variant="outline" size="icon" aria-label="Download CSV" onClick={csv}><Download /></Button>
            <Button className="flex-1" onClick={() => { if (!svgs.length) { toast.error("Still generating…"); return; } window.print(); }}><Printer />Print {codes.length}</Button>
          </div>
        </div>
        <p className="my-4 text-xs text-muted-foreground">Each code has a check letter at the end so a mistyped code is rejected. Codes are unique per print run.</p>
      </div>
      <style>{`@media print { @page { size: ${L.page}; margin: ${L.margin}; } body * { visibility: hidden; } #barcode-sheet, #barcode-sheet * { visibility: visible; } #barcode-sheet { position: absolute; inset: 0; } }`}</style>
      <div id="barcode-sheet" className="grid gap-2 bg-background" style={{ gridTemplateColumns: `repeat(${L.cols}, minmax(0, 1fr))` }}>
        {codes.map((c, i) => (
          <div key={c} className="flex flex-col items-center justify-center rounded border border-dashed p-2 text-center break-inside-avoid" style={{ minHeight: L.cellH, pageBreakAfter: L.cols === 1 ? "always" : undefined }}>
            <span className="text-[10px] font-bold uppercase tracking-wide">GetXpress · {t.label}</span>
            {svgs[i] ? <div className="my-1 w-full [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-h-24 [&>svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svgs[i]! }} /> : <div className="h-12" />}
            {sym !== "code128" && <span className="font-mono text-[11px] font-semibold">{c}</span>}
          </div>))}
      </div>
    </AppShell>
  );
}
