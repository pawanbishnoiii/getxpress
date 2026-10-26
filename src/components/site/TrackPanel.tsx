import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleDot, Loader2, PackageSearch, Truck, Warehouse, AlertTriangle, PackageCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ScanButton } from "./BarcodeScanner";

type Result = { tracking_number: string; status: string; service: string; from_city: string; to_city: string; created_at: string; pieces: { code: string; seq: number; total: number }[]; events: { status: string; location: string | null; note: string | null; created_at: string }[] } | null;

const STEPS = [
  { k: "booked", l: "Booked", i: PackageCheck },
  { k: "picked_up", l: "Picked up", i: Truck },
  { k: "in_transit", l: "In transit", i: Truck },
  { k: "at_hub", l: "At hub", i: Warehouse },
  { k: "out_for_delivery", l: "Out for delivery", i: Truck },
  { k: "delivered", l: "Delivered", i: CheckCircle2 },
];

/** In-dashboard tracking by AWB or parcel barcode, with camera scan and live updates. */
export function TrackPanel({ initial }: { initial?: string | undefined }) {
  const [val, setVal] = useState(initial ?? "");
  const [id, setId] = useState(initial ?? "");
  const qc = useQueryClient();
  useEffect(() => { if (initial) { setVal(initial); setId(initial); } }, [initial]);
  const { data, isFetching } = useQuery({
    queryKey: ["track", id], enabled: !!id,
    queryFn: async () => { const { data, error } = await supabase.rpc("track_shipment", { _tracking: id }); if (error) throw error; return data as Result; },
  });
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`track-${id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "tracking_events" }, () => qc.invalidateQueries({ queryKey: ["track", id] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);
  const go = (c: string) => { const v = c.trim().toUpperCase(); setVal(v); setId(v); };
  const reached = data ? STEPS.findIndex((s) => s.k === data.status) : -1;
  const exception = data && ["exception", "cancelled", "rto"].includes(data.status);
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2"><PackageSearch className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-extrabold">Track order</h2></div>
      <form onSubmit={(e) => { e.preventDefault(); if (val.trim()) go(val); }} className="mt-3 flex flex-wrap gap-2">
        <input aria-label="Tracking number or parcel barcode" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Tracking number or parcel barcode" className="h-12 min-w-0 flex-1 rounded-xl border bg-background px-4 font-mono font-bold outline-none focus:ring-2 focus:ring-ring" />
        <Button type="submit" className="h-12"><Search /> Track</Button>
        <ScanButton onCode={go} />
      </form>
      {isFetching && !data && <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-primary" />}
      {!isFetching && id && data === null && <p className="mt-6 rounded-xl border border-dashed p-6 text-center text-muted-foreground">No shipment found for {id}</p>}
      {data && (
        <div className="mt-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><p className="font-mono text-sm font-bold text-primary">{data.tracking_number}</p><p className="font-display text-2xl font-extrabold">{data.from_city} → {data.to_city}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${exception ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>{data.status.replaceAll("_", " ")}</span>
          </div>
          <div className="mt-5 grid grid-cols-6 gap-1">
            {STEPS.map((s, i) => { const I = s.i; const on = i <= reached; return (
              <div key={s.k} className="flex flex-col items-center gap-1 text-center">
                <span className={`grid h-9 w-9 place-items-center rounded-full ${on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><I className="h-4 w-4" /></span>
                <span className={`text-[10px] font-bold leading-tight ${on ? "" : "text-muted-foreground"}`}>{s.l}</span>
              </div>); })}
          </div>
          {exception && <p className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm font-bold text-destructive"><AlertTriangle className="h-4 w-4" /> Delivery exception — our team is on it.</p>}
          <ol className="mt-5 space-y-3 border-l-2 pl-4">
            {data.events.map((e, i) => (
              <li key={i} className="relative"><CircleDot className="absolute -left-[25px] top-0.5 h-4 w-4 bg-card text-primary" />
                <p className="text-sm font-bold capitalize">{e.status.replaceAll("_", " ")}{e.location ? ` · ${e.location}` : ""}</p>
                <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("en-IN")}{e.note ? ` — ${e.note}` : ""}</p></li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">{data.pieces.length} parcel(s): {data.pieces.map((p) => p.code).join(", ")}</p>
        </div>
      )}
    </section>
  );
}
