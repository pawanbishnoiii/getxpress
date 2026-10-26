import { useState } from "react";
import { HelpTickets } from "@/components/site/HelpTickets";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { brand } from "@/lib/brand";
import { FileDown, Globe2, MessageCircle, Printer, Search, ClipboardList, MapPin, PackagePlus, Phone, RotateCcw, Truck, UserRound } from "lucide-react";
import { AppShell, PageHeader, Stat } from "@/components/site/AppShell";
import { QuoteRequests } from "@/components/site/QuoteRequests";
import { TrackPanel } from "@/components/site/TrackPanel";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/users/dashboard")({
  validateSearch: (s) => z.object({ track: z.string().max(40).optional() }).parse(s),
  head: () => ({ meta: [{ title: "My dashboard — Get Xpress" }, { name: "description", content: "Track parcels, book pickups and manage returns." }, { property: "og:title", content: "My dashboard — Get Xpress" }, { property: "og:description", content: "Track parcels, book pickups and manage returns." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: UserDashboard,
});

function UserDashboard() {
  const { track } = Route.useSearch();
  const { data: me } = useProfile();
  const [q, setQ] = useState("");
  const { isStaff, isLoading } = useRoles();
  const { data: rows = [] } = useQuery({
    queryKey: ["my-shipments-all"], enabled: !!me?.user,
    queryFn: async () => (await supabase.from("shipments").select("id,tracking_number,status,price,created_at,sender_city,receiver_city,receiver_name").eq("user_id", me?.user.id ?? "").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  if (!isLoading && isStaff) return <Navigate to="/dashboard" />;
  const name = me?.profile?.full_name || (me?.user.user_metadata?.["full_name"] as string | undefined) || "there";
  const count = (st: string[]) => rows.filter((r) => st.includes(r.status)).length;
  const term = q.trim().toLowerCase();
  const shown = term ? rows.filter((r) => [r.tracking_number, r.receiver_name, r.sender_city, r.receiver_city, r.status.replaceAll("_", " ")].some((v) => String(v ?? "").toLowerCase().includes(term))).slice(0, 50) : rows.slice(0, 6);
  const spent = rows.filter((r) => r.status !== "cancelled").reduce((a, r) => a + Number(r.price), 0);
  return (
    <AppShell wide>
      <PageHeader title="My shipments" sub="Your shipping at a glance." />
      <div className="mb-5 flex flex-wrap gap-3 rounded-2xl border bg-card p-4 text-sm">
        <span className="flex items-center gap-1.5 font-bold"><UserRound className="h-4 w-4 text-primary" />{name}</span>
        <span className="flex items-center gap-1.5 font-mono"><Phone className="h-4 w-4 text-primary" />{me?.profile?.phone ?? "—"}</span>
        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" />{(me?.profile as { city?: string | null } | null | undefined)?.city || rows[0]?.sender_city || "India"}</span>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 print:hidden">
        <Link to="/users/addorder" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><PackagePlus className="h-4 w-4" />Create order</Link>
        <Link to="/international" className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-bold"><Globe2 className="h-4 w-4 text-primary"/>International quote</Link>
        <Link to="/track" className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-bold"><Search className="h-4 w-4 text-primary" />Track bulk</Link>
        <Link to="/users/orders" className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-bold"><FileDown className="h-4 w-4 text-primary" />Invoices & labels</Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-bold"><Printer className="h-4 w-4 text-primary" />Daily summary</button>
        <a href={`https://wa.me/${brand.supportPhone.replace(/\D/g, "")}?text=${encodeURIComponent("Hi GetXpress, I need help with my order")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-bold"><MessageCircle className="h-4 w-4 text-primary" />WhatsApp support</a>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <TrackPanel initial={track} />
        <div className="grid grid-cols-2 gap-3 self-start">
          <Link to="/users/addorder" className="rounded-2xl bg-primary p-5 text-primary-foreground"><PackagePlus className="h-7 w-7" /><p className="mt-5 font-display text-lg font-extrabold">Add order</p></Link>
          <Link to="/users/orders" className="rounded-2xl bg-ink p-5 text-ink-foreground"><ClipboardList className="h-7 w-7" /><p className="mt-5 font-display text-lg font-extrabold">My orders</p></Link>
          <Link to="/users/returns" className="col-span-2 rounded-2xl border bg-card p-5"><RotateCcw className="h-7 w-7 text-primary" /><p className="mt-3 font-display text-lg font-extrabold">Return a received parcel</p></Link>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total orders" value={rows.length} tone="ink" />
        <Stat label="On the way" value={count(["picked_up", "in_transit", "at_hub", "out_for_delivery"])} tone="primary" />
        <Stat label="Delivered" value={count(["delivered"])} tone="lime" />
        <Stat label="Spent (₹)" value={spent.toLocaleString("en-IN")} />
      </div>
      <QuoteRequests/>
      <HelpTickets />
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-extrabold">{q ? "Search results" : "Recent orders"}</h2>
        <label className="relative w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Search my orders" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tracking no., name, city or status" className="h-10 w-full rounded-xl border bg-card pl-9 pr-3 text-sm" /></label></div>
      <div className="mt-3 space-y-2">
        {q && shown.length === 0 && <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">No orders match "{q}".</p>}
        {rows.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">No orders yet — add your first order.</p>}
        {shown.map((s) => (
          <Link key={s.id} to="/users/dashboard" search={{ track: s.tracking_number }} className="flex items-center justify-between rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-3"><Truck className="h-5 w-5 text-primary" /><div><p className="font-bold">{s.sender_city} → {s.receiver_city}</p><p className="font-mono text-xs text-muted-foreground">{s.tracking_number} · {s.receiver_name}</p></div></div>
            <div className="text-right"><span className="rounded-full bg-cream px-3 py-1 text-xs font-bold capitalize">{s.status.replaceAll("_", " ")}</span><p className="mt-1 text-sm font-bold">₹{s.price}</p></div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
