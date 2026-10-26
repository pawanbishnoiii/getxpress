import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Printer, Search } from "lucide-react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/manifest")({
  head: () => ({ meta: [{ title: "Pickup & dispatch manifest — GetXpress" }, { name: "description", content: "Print the daily pickup and dispatch manifest with parcel counts, weights and handover signatures." }, { property: "og:title", content: "Dispatch manifest — GetXpress" }, { property: "og:description", content: "Daily driver handover sheet for GetXpress hubs." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Manifest,
});

function Manifest() {
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState(""), [status, setStatus] = useState("all");
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["manifest", day],
    queryFn: async () => {
      const from = new Date(`${day}T00:00:00`), to = new Date(from.getTime() + 86_400_000);
      const r = await supabase.from("shipments").select("id,tracking_number,sender_name,sender_city,sender_pincode,receiver_name,receiver_city,receiver_pincode,receiver_phone,pieces_count,weight_kg,payment_method,price,status,service").gte("created_at", from.toISOString()).lt("created_at", to.toISOString()).order("created_at").limit(500);
      if (r.error) throw r.error; return r.data;
    },
  });
  const rows = useMemo(() => data.filter((s) => (status === "all" || s.status === status) && (!q || `${s.tracking_number} ${s.receiver_name} ${s.receiver_pincode} ${s.receiver_city}`.toLowerCase().includes(q.toLowerCase()))), [data, q, status]);
  const statuses = [...new Set(data.map((s) => s.status))];
  const totals = rows.reduce((a, s) => ({ pcs: a.pcs + (s.pieces_count || 1), kg: a.kg + Number(s.weight_kg || 0), cod: a.cod + (s.payment_method === "cash_on_pickup" ? Number(s.price || 0) : 0) }), { pcs: 0, kg: 0, cod: 0 });
  return (
    <AppShell wide>
      <PageHeader title="Manifest" sub="Daily pickup and dispatch sheet for drivers and hubs." />
      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-xs font-semibold">Date<Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 w-44" /></label>
        <label className="text-xs font-semibold">Status<select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block h-10 rounded-md border bg-card px-3 text-sm"><option value="all">All</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="min-w-[220px] flex-1 text-xs font-semibold">Scan or search<div className="relative mt-1"><Search className="absolute left-3 top-3 h-4 w-4 opacity-50" /><Input autoFocus value={q} onChange={(e) => setQ(e.target.value.trim())} placeholder="Tracking number, name, PIN" className="pl-9 font-mono" /></div></label>
        <Button onClick={() => window.print()} disabled={!rows.length}><Printer />Print manifest</Button>
      </div>
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm"><b>GetXpress manifest · {day}</b><span>{rows.length} shipments · {totals.pcs} pcs · {totals.kg.toFixed(2)} kg · Cash to collect ₹{totals.cod.toFixed(0)}</span></div>
        {error ? <p className="text-sm text-destructive">Could not load shipments: {(error as Error).message}</p> : isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !rows.length ? <p className="py-8 text-center text-sm text-muted-foreground">No shipments for this date.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">#</th><th className="p-2">Tracking</th><th className="p-2">From</th><th className="p-2">To</th><th className="p-2">Pcs</th><th className="p-2">Kg</th><th className="p-2">Payment</th><th className="p-2">Status</th><th className="p-2">Sign</th></tr></thead>
            <tbody>{rows.map((s, i) => <tr key={s.id} className="border-b"><td className="p-2">{i + 1}</td><td className="p-2 font-mono font-bold">{s.tracking_number}<span className="block font-normal text-muted-foreground">{s.service}</span></td><td className="p-2">{s.sender_name}<span className="block text-muted-foreground">{s.sender_city} {s.sender_pincode}</span></td><td className="p-2">{s.receiver_name} · {s.receiver_phone}<span className="block text-muted-foreground">{s.receiver_city} {s.receiver_pincode}</span></td><td className="p-2">{s.pieces_count}</td><td className="p-2">{Number(s.weight_kg).toFixed(2)}</td><td className="p-2">{s.payment_method === "cash_on_pickup" ? `Cash ₹${Number(s.price).toFixed(0)}` : "Prepaid"}</td><td className="p-2">{s.status}</td><td className="w-24 p-2"><div className="h-6 border-b border-dashed" /></td></tr>)}</tbody>
          </table></div>
        )}
        <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-muted-foreground"><div className="border-t pt-2">Handed over by (hub)</div><div className="border-t pt-2">Received by (driver)</div></div>
      </div>
    </AppShell>
  );
}
