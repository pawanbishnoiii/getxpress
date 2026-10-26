import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AppShell, PageHeader, Stat } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Get Xpress" }, { name: "description", content: "Shipment analytics for your scope." }, { property: "og:title", content: "Analytics — Get Xpress" }, { property: "og:description", content: "Shipment analytics for your scope." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Analytics,
});

function Analytics() {
  const { data: rows = [] } = useQuery({
    queryKey: ["analytics-rows"],
    queryFn: async () => (await supabase.from("shipments").select("status,price,service,receiver_city,sender_city,created_at,routing_snapshot,payment_method,pieces_count").order("created_at", { ascending: false }).limit(2000)).data ?? [],
  });
  const a = useMemo(() => {
    const count = (f: (r: (typeof rows)[number]) => string) => Object.entries(rows.reduce<Record<string, number>>((m, r) => { const k = f(r); m[k] = (m[k] ?? 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]);
    const delivered = rows.filter((r) => r.status === "delivered").length;
    return {
      total: rows.length, revenue: rows.filter((r) => r.status !== "cancelled").reduce((s, r) => s + Number(r.price), 0),
      parcels: rows.reduce((s, r) => s + r.pieces_count, 0), deliveredPct: rows.length ? Math.round((delivered / rows.length) * 100) : 0,
      byStatus: count((r) => r.status), byService: count((r) => r.service), byDest: count((r) => r.receiver_city).slice(0, 8),
      trend: Array.from({ length: 30 }, (_, i) => { const d = new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10); const day = rows.filter((r) => r.created_at.slice(0, 10) === d); return { day: d.slice(5), orders: day.length, revenue: Math.round(day.filter((r) => r.status !== "cancelled").reduce((x, r) => x + Number(r.price), 0)) }; }),
      avg: rows.length ? Math.round(rows.reduce((x, r) => x + Number(r.price), 0) / rows.length) : 0,
      byZone: count((r) => ((r.routing_snapshot as { quote?: { zone?: string } })?.quote?.zone) ?? "unknown"), byPay: count((r) => r.payment_method),
    };
  }, [rows]);
  return (
    <AppShell wide>
      <PageHeader title="Analytics" sub="Live figures from shipments visible in your scope." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Shipments" value={a.total} tone="ink" />
        <Stat label="Parcels" value={a.parcels} />
        <Stat label="Revenue ₹" value={a.revenue.toLocaleString("en-IN")} tone="lime" />
        <Stat label="Delivered" value={`${a.deliveredPct}%`} tone="primary" />
      </div>
      <div className="mt-4 rounded-3xl border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-bold">Last 30 days</p><p className="text-xs text-muted-foreground">Average order ₹{a.avg.toLocaleString("en-IN")}</p></div>
        <div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={a.trend}><defs><linearGradient id="gxo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="day" fontSize={11} /><YAxis yAxisId="o" fontSize={11} allowDecimals={false} /><YAxis yAxisId="r" orientation="right" fontSize={11} /><Tooltip /><Area yAxisId="o" type="monotone" dataKey="orders" stroke="var(--primary)" fill="url(#gxo)" strokeWidth={2} /><Area yAxisId="r" type="monotone" dataKey="revenue" stroke="var(--foreground)" fill="transparent" strokeDasharray="4 3" /></AreaChart></ResponsiveContainer></div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <Bars title="By status" data={a.byStatus} />
        <Bars title="Top destinations" data={a.byDest} />
        <Bars title="By zone" data={a.byZone} />
        <Bars title="By service" data={a.byService} />
        <Bars title="Payment mode" data={a.byPay} />
      </div>
    </AppShell>
  );
}

function Bars({ title, data }: { title: string; data: [string, number][] }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <div className="rounded-3xl border bg-card p-5">
      <p className="font-bold">{title}</p>
      <div className="mt-3 space-y-2">
        {data.map(([k, v]) => (
          <div key={k}><div className="flex justify-between text-sm"><span className="capitalize">{k.replaceAll("_", " ")}</span><b>{v}</b></div><div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} /></div></div>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
      </div>
    </div>
  );
}
