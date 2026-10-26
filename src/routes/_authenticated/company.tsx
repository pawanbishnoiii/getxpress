import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Boxes, CheckCircle2, IndianRupee, Search, Sparkles, Truck } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_SHIPMENTS } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/company")({
  head: () => ({ meta: [{ title: "Company dashboard — Get Xpress" }, { name: "description", content: "Shipment metrics and every company order in one place." }, { property: "og:title", content: "Company dashboard — Get Xpress" }, { property: "og:description", content: "Shipment metrics and company orders." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Company,
});

type Row = { tracking_number: string; sender_name: string; sender_city: string; receiver_city: string; status: string; service: string; price: number; created_at: string };

function Company() {
  const [rows, setRows] = useState<Row[]>([]);
  const [demo, setDemo] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    void supabase.from("shipments").select("tracking_number,sender_name,sender_city,receiver_city,status,service,price,created_at").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);

  const all: Row[] = demo ? DEMO_SHIPMENTS.map((d, i) => ({ tracking_number: d.tracking_number, sender_name: d.customer, sender_city: d.sender_city, receiver_city: d.receiver_city, status: d.status, service: d.service, price: d.price, created_at: new Date(Date.now() - i * 36e5).toISOString() })) : rows;
  const list = useMemo(() => all.filter((r) => (status === "all" || r.status === status) && `${r.tracking_number} ${r.sender_name} ${r.sender_city} ${r.receiver_city}`.toLowerCase().includes(q.toLowerCase())), [all, q, status]);
  const delivered = all.filter((r) => r.status === "delivered").length;
  const moving = all.filter((r) => !["delivered", "booked", "cancelled"].includes(r.status)).length;
  const revenue = all.reduce((s, r) => s + Number(r.price || 0), 0);
  const statuses = Array.from(new Set(all.map((r) => r.status)));
  const cards = [{ l: "Total orders", v: all.length, i: Boxes }, { l: "In transit", v: moving, i: Truck }, { l: "Delivered", v: delivered, i: CheckCircle2 }, { l: "Revenue", v: `₹${revenue.toLocaleString("en-IN")}`, i: IndianRupee }];

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold">Company dashboard</h1>
        <button onClick={() => setDemo((d) => !d)} className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-2 font-bold">
          <Sparkles className="h-4 w-4 text-primary" /> {demo ? "Show real data" : "Load demo data"}
        </button>
      </div>
      {demo && <p className="mt-1 text-sm text-muted-foreground">Showing sample orders only — nothing is saved.</p>}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.l} className="rounded-3xl border bg-card p-4"><c.i className="h-5 w-5 text-primary" /><p className="mt-2 text-xs font-bold uppercase text-muted-foreground">{c.l}</p><p className="font-display text-2xl font-extrabold">{c.v}</p></div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-2xl border bg-card px-3"><Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search AWB, customer or city" className="w-full bg-transparent text-sm outline-none" /></label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-2xl border bg-card px-3 text-sm capitalize">
          <option value="all">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
        </select>
      </div>
      <div className="mt-3 overflow-x-auto rounded-3xl border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">AWB</th><th>Customer</th><th>Route</th><th>Service</th><th>Status</th><th className="pr-3 text-right">Price</th></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.tracking_number} className="border-t"><td className="p-3 font-mono font-bold">{r.tracking_number}</td><td>{r.sender_name}</td><td>{r.sender_city} → {r.receiver_city}</td><td className="capitalize">{r.service}</td><td className="capitalize">{r.status.replaceAll("_", " ")}</td><td className="pr-3 text-right">₹{Number(r.price).toLocaleString("en-IN")}</td></tr>
          ))}</tbody>
        </table>
        {!list.length && <p className="p-6 text-center text-muted-foreground">No orders yet. Try “Load demo data”.</p>}
      </div>
    </AppShell>
  );
}
