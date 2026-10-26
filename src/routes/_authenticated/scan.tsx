import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, CheckCircle2, CircleAlert, Loader2, MapPin, PackageCheck, ScanLine, Truck } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { classifyException } from "@/lib/ops-rules";
import { useServerFn } from "@tanstack/react-start";
import { notifyStatusEmail } from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({ meta: [{ title: "Scan parcel — Get Xpress" }, { name: "description", content: "Scan a parcel barcode or QR to update its status." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Scan,
});

type Info = { tracking_number: string; status: string; from_city: string; to_city: string; pieces: { code: string; seq: number; total: number }[]; events: { status: string; location: string | null; piece: string | null; at: string }[] } | null;

/** QR labels encode the tracking URL; barcodes encode the raw ID. */
export function extractCode(text: string) {
  const t = text.trim();
  try { const u = new URL(t); const id = u.searchParams.get("id"); if (id) return id.toUpperCase(); } catch { /* not a URL */ }
  return t.toUpperCase();
}

const STATUSES = ["picked_up", "in_transit", "at_hub", "out_for_delivery", "delivered", "exception"] as const;
const STATUS_META: Record<(typeof STATUSES)[number], { label: string; hint: string }> = {
  picked_up: { label: "Picked up", hint: "Collected from sender" },
  in_transit: { label: "In transit", hint: "Moving between hubs" },
  at_hub: { label: "At hub", hint: "Received at a facility" },
  out_for_delivery: { label: "Out for delivery", hint: "With the delivery runner" },
  delivered: { label: "Delivered", hint: "Handed to recipient" },
  exception: { label: "Exception", hint: "Needs an operational action" },
};

function Scan() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("picked_up");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [result, setResult] = useState<{ awb: string; piece: string | null; status: string } | null>(null);
  const [info, setInfo] = useState<Info>(null);
  const notify = useServerFn(notifyStatusEmail);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  useEffect(() => () => { scannerRef.current?.stop().catch(() => {}); }, []);

  const startCam = async () => {
    setCamOn(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    const sc = new Html5Qrcode("scan-box");
    scannerRef.current = sc;
    try {
      await sc.start({ facingMode: "environment" }, { fps: 8, qrbox: { width: 220, height: 160 } }, (text) => {
        const c = extractCode(text);
        setCode(c);
        toast.success(`Captured ${c}`);
        void lookup(c);
        sc.stop().catch(() => {}); setCamOn(false);
      }, () => {});
    } catch { toast.error("Camera not available — type the code instead."); setCamOn(false); }
  };

  const submit = () => submitCode(code);
  /** Look up the shipment first so staff can see it before changing its status. */
  const lookup = async (raw: string) => {
    const c = extractCode(raw); if (!c) return;
    const t = await supabase.rpc("track_shipment", { _tracking: c });
    if (t.error || !t.data) { toast.error("No shipment found for this code."); setInfo(null); return; }
    setInfo(t.data as Info); setResult(null);
  };
  const submitCode = async (raw: string) => {
    const c = extractCode(raw);
    if (!c) return;
    setBusy(true); setResult(null);
    const { data, error } = await supabase.rpc("scan_piece", { _code: c, _status: status, ...(location.trim() ? { _location: location.trim() } : {}), ...(note.trim() ? { _note: note.trim() } : {}) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const d = data as { tracking_number: string; piece_code: string | null; status: string };
    setResult({ awb: d.tracking_number, piece: d.piece_code, status: d.status });
    void notify({ data: { tracking: d.tracking_number } }).catch(() => {});
    const t = await supabase.rpc("track_shipment", { _tracking: c });
    setInfo(t.data as Info);
    setCode(c);
  };

  return (
    <AppShell>
      <section className="gx-scan-head">
        <span className="gx-scan-head-icon"><ScanLine className="h-6 w-6" /></span>
        <div><p>Operations · live updates</p><h1>Scan a parcel</h1><span>Find the label, choose the handover state, then record a clean scan.</span></div>
        <div className="gx-scan-head-chip"><PackageCheck className="h-4 w-4" />Barcode & QR ready</div>
      </section>

      <div className="gx-scan-workbench">
        <section className="gx-scan-panel">
          <div className="gx-scan-panel-title"><span>01</span><div><h2>Identify the parcel</h2><p>Use the camera or enter an AWB / piece barcode.</p></div></div>
          <div id="scan-box" className={`mt-4 overflow-hidden rounded-2xl ${camOn ? "min-h-64 border" : "hidden"}`} />
          <button onClick={startCam} className="gx-scan-camera mt-4"><Camera className="h-5 w-5" /> {camOn ? "Scanning… point at the label" : "Open camera scanner"}</button>
          <label className="gx-scan-code mt-3">
            <span>AWB or piece ID</span>
            <div><ScanLine className="h-5 w-5 text-primary" /><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") void lookup(code); }} placeholder="GX26100100001" /><button type="button" onClick={() => void lookup(code)}>Find</button></div>
          </label>
          {info && <div className="gx-scan-lookup"><PackageCheck className="h-5 w-5" /><span>Found <b>{info.tracking_number}</b> · {info.from_city} → {info.to_city}</span></div>}
        </section>

        <section className="gx-scan-panel gx-scan-action-panel">
          <div className="gx-scan-panel-title"><span>02</span><div><h2>Record the handover</h2><p>Choose the exact state. Add a location for a traceable timeline.</p></div></div>
          <div className="gx-scan-status-grid">
            {STATUSES.map((st) => (
              <button key={st} onClick={() => setStatus(st)} className={status === st ? "is-active" : ""}><b>{STATUS_META[st].label}</b><span>{STATUS_META[st].hint}</span></button>
            ))}
          </div>
          <div className="gx-scan-fields">
            <label><MapPin className="h-4 w-4" /><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location, e.g. Jaipur hub" /></label>
            <label><Truck className="h-4 w-4" /><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={status === "exception" ? "Describe the exception and next action" : "Optional handling note"} /></label>
          </div>
          {status === "exception" && note.trim().length > 3 && (() => {
            const c = classifyException(note);
            return <div className="gx-scan-exception"><CircleAlert className="h-5 w-5" /><div><b>{c.category} · {c.severity} priority</b><span>Recommended next step: {c.action}</span></div></div>;
          })()}
          <button onClick={submit} disabled={busy || !code.trim()} className="gx-scan-save">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} {busy ? "Recording scan…" : `Record ${STATUS_META[status].label.toLowerCase()} scan`}</button>
        </section>
      </div>

      {result && (
        <div role="status" className="gx-scan-success">
          <CheckCircle2 className="h-8 w-8 text-primary" />
          <div>
            <p className="font-bold">Saved: {result.status.replaceAll("_", " ")}</p>
            <p className="text-sm text-muted-foreground">{result.awb}{result.piece ? ` · ${result.piece}` : ""}</p>
          </div>
        </div>
      )}
      {info && (
        <div className="gx-scan-shipment-card">
          <p className="text-xs font-bold text-muted-foreground">Shipment · {info.tracking_number}</p>
          <p className="font-display text-xl font-extrabold">{info.from_city} → {info.to_city}</p>
          <p className="mt-1 text-sm">Current status: <b className="capitalize">{String((info as { status?: string }).status ?? "").replaceAll("_", " ")}</b></p>
          <div className="mt-2 flex flex-wrap gap-1">{info.pieces.map((raw, i) => { const p = raw as { code?: string; piece_code?: string; seq?: number; seq_no?: number; total?: number }; const code = p.code ?? p.piece_code ?? ""; return <span key={code || i} className="rounded-full border px-2 py-0.5 font-mono text-xs">{p.seq ?? p.seq_no ?? i + 1}/{p.total ?? info.pieces.length} {code}</span>; })}</div>
          <ol className="mt-3 space-y-1 text-sm">{info.events.slice(0, 5).map((raw, i) => { const e = raw as { status: string; location: string | null; piece?: string | null; at?: string; created_at?: string; note?: string | null }; const when = e.at ?? e.created_at; return <li key={i}><b className="capitalize">{e.status.replaceAll("_", " ")}</b> <span className="text-muted-foreground">{e.location ?? ""} {e.piece ?? e.note ?? ""}{when ? ` · ${new Date(when).toLocaleString("en-IN")}` : ""}</span></li>; })}</ol>
        </div>
      )}
    </AppShell>
  );
}
