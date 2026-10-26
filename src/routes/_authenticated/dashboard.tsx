import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { QuoteRequests } from "@/components/site/QuoteRequests";
import { TrackPanel } from "@/components/site/TrackPanel";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Crown, MapPin, PackagePlus, PackageSearch, ScanLine, ShieldCheck, Store, Users } from "lucide-react";
import { AppShell, PageHeader, Stat } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { ROLE_LABEL, useRoles } from "@/hooks/use-roles";
import { scoreBooking } from "@/lib/ops-rules";
import { RoleWorkspace } from "@/components/site/RoleWorkspace";
import { Button } from "@/components/ui/button";
import { AdminShipmentTable } from "@/components/site/AdminShipmentTable";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Get Xpress" }, { name: "description", content: "Your Get Xpress shipping dashboard." }, { property: "og:title", content: "Dashboard — Get Xpress" }, { property: "og:description", content: "Your Get Xpress shipping dashboard." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Dashboard,
});

type Summary = { shipments: number; today: number; revenue: number; by_status: Record<string, number>; last7: { d: string; n: number }[]; pincodes: number; delegated: number; team: number; applications: number; users: number };

function Dashboard() {
  const { data: me } = useProfile();
  const { roles, primary, isStaff, isAdmin, isLoading: rolesLoading } = useRoles();
  const qc = useQueryClient();
  const name = (me?.profile?.full_name || (me?.user.user_metadata?.["full_name"] as string | undefined) || "there").split(" ")[0];

  const { data: noAdmin } = useQuery({ queryKey: ["admin-exists"], queryFn: async () => !(await supabase.rpc("admin_exists")).data });
  const { data: mine = [] } = useQuery({
    queryKey: ["my-shipments"], enabled: !!me?.user,
    queryFn: async () => (await supabase.from("shipments").select("id,tracking_number,status,price,created_at,sender_city,receiver_city").eq("user_id", me?.user.id ?? "").order("created_at", { ascending: false }).limit(5)).data ?? [],
  });
  const { data: sum } = useQuery({ queryKey: ["summary"], enabled: isStaff, queryFn: async () => (await supabase.rpc("dashboard_summary")).data as unknown as Summary });

  const claim = async () => {
    const { error } = await supabase.rpc("claim_first_admin");
    if (error) { toast.error(error.message); return; }
    toast.success("You are now the Admin");
    qc.invalidateQueries();
  };
  if (!rolesLoading && !isStaff && noAdmin === false) return <Navigate to="/users/dashboard" />;
  const max = Math.max(1, ...(sum?.last7 ?? []).map((x) => x.n));
  const last7 = sum?.last7 ?? [], byStatus = sum?.by_status ?? {};

  return (
    <AppShell wide>
      <PageHeader title={primary ? `${ROLE_LABEL[primary]} workspace` : `Shipping dashboard`} sub={primary ? `${ROLE_LABEL[primary]} dashboard — data limited to your assigned scope.` : "What are we sending today?"}
        action={<div className="flex flex-wrap gap-1.5">{roles.map((r) => <span key={r} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{ROLE_LABEL[r]}</span>)}</div>} />

      {noAdmin && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-dashed border-primary bg-primary/5 p-5">
          <div className="flex items-center gap-3"><Crown className="h-8 w-8 text-primary" /><div><p className="font-bold">No Admin has been set up yet</p><p className="text-sm text-muted-foreground">The first signed-in owner can claim Admin once. After that this option disappears for everyone.</p></div></div>
          <button onClick={claim} className="rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground">Make me Admin</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link to="/users/addorder" className="rounded-lg bg-primary p-5 text-primary-foreground shadow-glow"><PackagePlus className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Book parcel</p></Link>
        <Link to="/tally" className="rounded-lg bg-lime p-5 text-ink"><PackageSearch className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Delivery tally</p></Link>
        {isStaff ? <>
          <Link to="/scan" className="rounded-lg bg-ink p-5 text-ink-foreground"><ScanLine className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Scan parcel</p></Link>
          {isAdmin ? <Link to="/admin/console" className="rounded-lg border bg-card p-5"><ShieldCheck className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Pincodes & staff</p></Link> : <Link to="/wallet" className="rounded-lg border bg-card p-5"><ShieldCheck className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Wallet</p></Link>}
        </> : <Link to="/point-partner" className="col-span-2 rounded-lg border bg-card p-5 md:col-span-2"><Store className="h-7 w-7" /><p className="mt-6 font-display text-xl font-extrabold">Become a Get Xpress Hub</p></Link>}
      </div>

      {isStaff && sum && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-extrabold">Your scope</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Shipments in scope" value={sum.shipments} tone="ink" />
            <Stat label="Booked today" value={sum.today} />
            <Stat label="Revenue (₹)" value={Number(sum.revenue).toLocaleString("en-IN")} tone="lime" />
            {isAdmin ? <Stat label="Pending applications" value={sum.applications} tone="primary" /> : <Stat label="My pincodes" value={sum.pincodes} tone="primary" />}
            <Stat label="Pincodes delegated" value={sum.delegated} />
            <Stat label="Team members" value={sum.team} />
            {isAdmin && <Stat label="Registered users" value={sum.users} />}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-5">
              <p className="font-bold">Bookings — last 7 days</p>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last7.map((x) => ({ day: new Date(x.d).toLocaleDateString("en-IN", { weekday: "short" }), n: x.n }))}>
                    <defs><linearGradient id="gx" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} width={28} /><Tooltip />
                    <Area type="monotone" dataKey="n" name="Bookings" stroke="var(--primary)" fill="url(#gx)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="sr-only">{max}</div>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <p className="font-bold">Shipment pipeline</p>
              <div className="mt-4 h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(byStatus).map(([status,count])=>({status:status.replaceAll("_"," "),count}))}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="status" tick={{fontSize:10}}/><YAxis allowDecimals={false} width={28}/><Tooltip/><Bar dataKey="count" fill="var(--chart-2)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
              <div className="mt-3 space-y-2">
                {Object.entries(byStatus).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm"><span className="capitalize">{k.replaceAll("_", " ")}</span><span className="font-bold">{v}</span></div>
                ))}
                {Object.keys(byStatus).length === 0 && <p className="text-sm text-muted-foreground">No shipments in your scope yet.</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <Link to="/analytics" className="rounded-xl border px-3 py-2 text-xs font-bold">Full analytics</Link>
                {isAdmin && <><Link to="/admin/console" className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><MapPin className="h-3 w-3" /> Allocations</Link><Link to="/admin/team" className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><Users className="h-3 w-3" /> Users</Link></>}
              </div>
            </div>
          </div>
        </section>
      )}

      {primary && primary !== "admin" && primary !== "point" && <RoleWorkspace role={primary} />}
      {isAdmin && <BookingScores />}
      {isAdmin && <AdminShipmentTable />}

      {isAdmin && <QuoteRequests/>}
      <div className="mt-8"><TrackPanel /></div>
      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold">Recent orders</h2>
        <Link to="/orders" className="text-sm font-bold text-primary">View all →</Link>
      </div>
      <div className="mt-4 space-y-2">
        {mine.length === 0 && <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No orders yet — add your first order.</p>}
        {mine.map((s) => (
          <Link key={s.id} to="/users/dashboard" search={{ track: s.tracking_number }} className="flex items-center justify-between rounded-2xl border bg-card p-4">
            <div><p className="font-bold">{s.sender_city} → {s.receiver_city}</p><p className="font-mono text-xs text-muted-foreground">{s.tracking_number}</p></div>
            <div className="text-right"><span className="rounded-full bg-cream px-3 py-1 text-xs font-bold capitalize">{s.status.replaceAll("_", " ")}</span><p className="mt-1 text-sm font-bold">₹{s.price}</p></div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

function BookingScores() {
  const { data = [] } = useQuery({
    queryKey: ["booking-scores"],
    queryFn: async () => {
      const { data: rows } = await supabase.from("shipments").select("id,tracking_number,weight_kg,pieces_count,declared_value,payment_method,receiver_phone,receiver_address,receiver_pincode,sender_city,receiver_city,created_at").order("created_at", { ascending: false }).limit(15);
      const pins = [...new Set((rows ?? []).map((r) => r.receiver_pincode))];
      const { data: ok } = pins.length ? await supabase.from("pincodes").select("pincode").in("pincode", pins).eq("active", true) : { data: [] };
      const live = new Set((ok ?? []).map((p) => p.pincode));
      return (rows ?? []).map((r) => ({ ...r, ...scoreBooking({ ...r, weight_kg: Number(r.weight_kg), declared_value: r.declared_value == null ? null : Number(r.declared_value), serviceable: live.has(r.receiver_pincode), same_city: r.sender_city === r.receiver_city }) }));
    },
  });
  return (
    <section className="mt-8 rounded-lg border bg-card p-5">
      <h2 className="font-display text-2xl font-extrabold">Booking quality scores</h2>
      <p className="text-sm text-muted-foreground">Checked from parcel details and serviceability. Lower score = needs attention.</p>
      <div className="mt-4 divide-y">
        {data.length === 0 && <p className="py-4 text-sm text-muted-foreground">No bookings yet.</p>}
        {data.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div><p className="font-mono font-bold">{b.tracking_number}</p><p className="text-xs text-muted-foreground">{b.sender_city} → {b.receiver_city} · {b.reason}</p></div>
            <span className={`rounded-full px-3 py-1 font-bold ${b.score >= 80 ? "bg-lime text-ink" : b.score >= 50 ? "bg-cream" : "bg-destructive text-destructive-foreground"}`}>{b.score}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
