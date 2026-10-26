import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { buildLabelsPdf, downloadBlob, LABEL_LAYOUTS, type LabelPiece, type LabelShipment } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/labels/$shipmentId")({
  head: () => ({ meta: [{ title: "Shipping labels — GetXpress" }, { name: "description", content: "Print or download GetXpress shipping labels." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Labels,
});

function Labels() {
  const { shipmentId } = Route.useParams();
  const navigate = useNavigate();
  const [layout, setLayout] = useState<string>("thermal");
  const [custom, setCustom] = useState({ w: 100, h: 150 });
  const [selected, setSelected] = useState<Set<string> | null>(null); // null = all
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["labels", shipmentId],
    queryFn: async () => {
      const { data: s, error } = await supabase.from("shipments").select("*").eq("id", shipmentId).single();
      if (error) throw error;
      const { data: pieces } = await supabase.from("shipment_pieces").select("*").eq("shipment_id", shipmentId).order("seq_no");
      return { s: s as LabelShipment & { id: string; status: string }, pieces: (pieces ?? []) as (LabelPiece & { id: string })[] };
    },
  });

  const chosen = () => {
    if (!data) return [];
    return selected ? data.pieces.filter((p) => selected.has(p.id)) : data.pieces;
  };

  const logPrints = async (pieces: (LabelPiece & { id: string })[], reprint: boolean) => {
    let reason: string | null = null;
    if (reprint) {
      reason = window.prompt("Reprint reason (logged):")?.trim() || null;
      if (!reason) { toast.error("Reprint cancelled — a reason is required."); return false; }
    }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("label_prints").insert(pieces.map((p) => ({ piece_id: p.id, printed_by: u.user!.id, reason })));
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const generate = async (mode: "download" | "print") => {
    if (!data) return;
    const pieces = chosen();
    if (!pieces.length) { toast.error("Select at least one parcel."); return; }
    const reprint = await supabase.from("label_prints").select("id", { count: "exact", head: true }).in("piece_id", pieces.map((p) => p.id)).then((r) => (r.count ?? 0) > 0);
    if (!(await logPrints(pieces, reprint))) return;
    setBusy(true);
    try {
      const blob = await buildLabelsPdf(data.s, pieces, layout === "custom" ? { id: "custom", label: "Custom", hint: "", page: [Math.max(50, custom.w), Math.max(50, custom.h)], cols: 1, rows: 1 } : layout);
      if (mode === "download") downloadBlob(blob, `labels-${data.s.tracking_number}.pdf`);
      else {
        const url = URL.createObjectURL(blob);
        const w = window.open("", "_blank");
        if (w) { w.location.href = url; } else downloadBlob(blob, `labels-${data.s.tracking_number}.pdf`);
      }
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  if (isLoading) return <AppShell><div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;
  if (!data) return <AppShell><p className="pt-20 text-center font-bold">Shipment not found.</p></AppShell>;
  const { s, pieces } = data;
  const blocked = s.status === "awaiting_payment" || s.status === "cancelled";

  return (
    <AppShell>
      <button onClick={() => navigate({ to: "/dashboard" })} className="mb-4 flex items-center gap-1 text-sm font-bold text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Back</button>
      <h1 className="font-display text-3xl font-extrabold">Shipping labels</h1>
      <p className="text-muted-foreground">Master AWB <span className="font-bold text-ink">{s.tracking_number}</span> · {pieces.length} parcel{pieces.length > 1 ? "s" : ""}</p>

      {blocked && (
        <div className="mt-4 rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          {s.status === "awaiting_payment" ? "Payment is pending — labels unlock after the booking is confirmed." : "This booking was cancelled — its label IDs are void and will never be reused."}
        </div>
      )}

      <div className="mt-5 space-y-2">
        {pieces.map((p) => (
          <label key={p.id} className="flex items-center justify-between rounded-2xl border bg-card p-4">
            <div>
              <p className="font-mono font-bold">{p.piece_code}</p>
              <p className="text-xs text-muted-foreground">Parcel {p.seq_no} of {p.total} · {p.weight_kg} kg</p>
            </div>
            <input type="checkbox" className="h-5 w-5 accent-primary" disabled={blocked}
              checked={selected ? selected.has(p.id) : true}
              onChange={(e) => {
                const cur = new Set(selected ?? pieces.map((x) => x.id));
                if (e.target.checked) cur.add(p.id); else cur.delete(p.id);
                setSelected(cur.size === pieces.length ? null : cur);
              }} />
          </label>
        ))}
      </div>

      <h2 className="mt-6 font-bold">Label format <span className="text-sm font-normal text-muted-foreground">· लेबल का साइज़ चुनें</span></h2>
      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
        {LABEL_LAYOUTS.map((l) => (
          <button key={l.id} onClick={() => setLayout(l.id)} className={`relative rounded-2xl border p-3 text-left text-sm ${layout === l.id ? "border-primary bg-primary/5 ring-2 ring-primary" : "bg-card"}`}>
            {l.recommended && <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">Best</span>}
            <span className="block font-bold">{l.label}</span><span className="text-xs text-muted-foreground">{l.hint}</span>
          </button>
        ))}
        <button onClick={() => setLayout("custom")} className={`rounded-2xl border p-3 text-left text-sm ${layout === "custom" ? "border-primary bg-primary/5 ring-2 ring-primary" : "bg-card"}`}>
          <span className="block font-bold">Custom size</span><span className="text-xs text-muted-foreground">अपना साइज़ (mm)</span>
        </button>
      </div>
      {layout === "custom" && (
        <div className="mt-3 flex gap-3">
          {(["w", "h"] as const).map((k) => (
            <label key={k} className="text-xs font-semibold text-muted-foreground">{k === "w" ? "Width mm" : "Height mm"}
              <input type="number" min={50} max={300} value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: Number(e.target.value) })} className="mt-1 block h-10 w-28 rounded-md border bg-background px-2 text-foreground" />
            </label>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={() => generate("print")} disabled={busy || blocked} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground disabled:opacity-40">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />} Print labels
        </button>
        <button onClick={() => generate("download")} disabled={busy || blocked} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink font-bold text-ink-foreground disabled:opacity-40">
          <Download className="h-5 w-5" /> Download PDF
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Every print is logged. Reprints need a reason. Barcodes are Code 128 and the QR opens live tracking.</p>
    </AppShell>
  );
}
