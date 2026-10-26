import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Gauge, XCircle } from "lucide-react";
import { AppShell, PageHeader, Stat } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { ScanButton } from "@/components/site/BarcodeScanner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/tally")({
  head: () => ({ meta: [{ title: "Delivery tally — Get Xpress" }, { name: "description", content: "Scan parcels received at your hub and see your delivery score." }, { property: "og:title", content: "Delivery tally — Get Xpress" }, { property: "og:description", content: "Hub receiving tally and delivery score." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Tally,
});

type Row = { code: string; ok: boolean; msg: string; at: string };

function Tally() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"at_hub" | "out_for_delivery" | "delivered" | "exception">("at_hub");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: score } = useQuery({
    queryKey: ["hub-score"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const { data } = await supabase.from("tracking_events").select("status,created_at").gte("created_at", since).in("status", ["at_hub", "out_for_delivery", "delivered", "exception"]).limit(5000);
      const c = (s: string) => (data ?? []).filter((e) => e.status === s).length;
      const today = (data ?? []).filter((e) => e.status === "at_hub" && e.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
      const delivered = c("delivered"), exc = c("exception");
      return { received: c("at_hub"), delivered, exc, today, pct: delivered + exc ? Math.round((delivered / (delivered + exc)) * 100) : 100 };
    },
  });
  useEffect(() => {
    const ch = supabase.channel("tally-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "tracking_events" }, () => qc.invalidateQueries({ queryKey: ["hub-score"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  const scan = async (raw: string) => {
    const c = raw.trim().toUpperCase(); if (!c) return;
    if (rows.some((r) => r.code === c && r.ok)) { toast.info(`${c} already tallied`); return; }
    const { error } = await supabase.rpc("scan_piece", { _code: c, _status: status });
    const row = { code: c, ok: !error, msg: error ? error.message : status.replaceAll("_", " "), at: new Date().toLocaleTimeString("en-IN") };
    setRows((r) => [row, ...r]); setCode(""); inputRef.current?.focus();
    if (error) toast.error(error.message); else navigator.vibrate?.(40);
  };
  const ok = rows.filter((r) => r.ok).length;
  return (
    <AppShell wide>
      <PageHeader title="Delivery tally" sub="Scan every parcel that reaches your hub. Updates go live instantly." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="This session" value={ok} tone="ink" />
        <Stat label="Received today" value={score?.today ?? 0} />
        <Stat label="Delivered (30d)" value={score?.delivered ?? 0} tone="lime" />
        <Stat label="Exceptions (30d)" value={score?.exc ?? 0} />
        <div className="rounded-lg bg-primary p-5 text-primary-foreground"><p className="flex items-center gap-1 text-xs font-bold uppercase opacity-80"><Gauge className="h-4 w-4" /> Delivery score</p><p className="mt-2 font-display text-3xl font-extrabold">{score?.pct ?? 100}%</p></div>
      </div>
      <div className="mt-5 rounded-2xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap gap-2">{(["at_hub", "out_for_delivery", "delivered", "exception"] as const).map((s) => <Button key={s} variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)} className="capitalize">{s.replaceAll("_", " ")}</Button>)}</div>
        <form onSubmit={(e) => { e.preventDefault(); scan(code); }} className="flex flex-wrap gap-2">
          <input ref={inputRef} autoFocus aria-label="Parcel code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Scan or type parcel code / AWB" className="h-12 min-w-0 flex-1 rounded-xl border bg-background px-4 font-mono font-bold" />
          <Button type="submit" className="h-12">Add to tally</Button>
          <ScanButton onCode={scan} label="Camera" />
        </form>
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl border bg-card">
        <table className="enterprise-table"><thead><tr><th>Time</th><th>Parcel</th><th>Result</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}><td>{r.at}</td><td className="font-mono font-bold">{r.code}</td><td className={r.ok ? "" : "text-destructive"}>{r.ok ? <CheckCircle2 className="mr-1 inline h-4 w-4 text-primary" /> : <XCircle className="mr-1 inline h-4 w-4" />}<span className="capitalize">{r.msg}</span></td></tr>)}</tbody></table>
        {rows.length === 0 && <p className="p-10 text-center text-muted-foreground">Scan the first parcel to start the tally.</p>}
      </div>
    </AppShell>
  );
}
