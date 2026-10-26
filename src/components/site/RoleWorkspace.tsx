import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Boxes, Coins, MapPin, Store, Truck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, type Role } from "@/hooks/use-roles";

const PAGES: Record<string, { to: string; label: string; icon: typeof Users }[]> = {
  state_director: [{ to: "/team-prices", label: "Team prices", icon: Coins }, { to: "/applications", label: "Hub applications", icon: Store }, { to: "/analytics", label: "State analytics", icon: MapPin }],
  state_manager: [{ to: "/team-prices", label: "Team prices", icon: Coins }, { to: "/applications", label: "Review hubs", icon: Store }, { to: "/orders", label: "State orders", icon: Truck }],
  area_manager: [{ to: "/orders", label: "Area orders", icon: Truck }, { to: "/tally", label: "Hub delivery tally", icon: Boxes }, { to: "/team-prices", label: "View prices", icon: Coins }],
  network: [{ to: "/bags", label: "Dispatch center", icon: Boxes }, { to: "/scan", label: "Scan parcels", icon: Truck }, { to: "/returns", label: "Returns & RTO", icon: MapPin }],
};

/** Role-specific shortcuts plus a CRM table of the people in the caller's scope. */
export function RoleWorkspace({ role }: { role: Role }) {
  const pages = PAGES[role];
  const [q, setQ] = useState("");
  const { data: people = [] } = useQuery({ queryKey: ["staff-directory"], enabled: role !== "network", queryFn: async () => (await supabase.rpc("staff_directory")).data ?? [] });
  const { data: transit = [] } = useQuery({ queryKey: ["network-manifests"], enabled: role === "network", queryFn: async () => (await supabase.from("manifests").select("*").neq("status", "received").order("created_at", { ascending: false }).limit(20)).data ?? [] });
  if (!pages) return null;
  const rows = people.filter((p) => !q || `${p.full_name} ${p.phone} ${p.states?.join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-extrabold">{ROLE_LABEL[role]} tools</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {pages.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="flex items-center gap-3 rounded-lg border bg-card p-4 font-bold hover:border-primary"><Icon className="h-5 w-5 text-primary" />{label}</Link>)}
      </div>
      {role === "network" ? (
        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <p className="p-4 font-bold">Manifests on the move</p>
          <table className="enterprise-table"><thead><tr><th>Manifest</th><th>Route</th><th>Vehicle</th><th>Status</th></tr></thead>
            <tbody>{transit.map((m) => <tr key={m.id}><td className="font-mono font-bold">{m.manifest_code}</td><td>{m.from_location} → {m.to_location}</td><td>{m.vehicle_no}</td><td className="capitalize">{m.status}</td></tr>)}</tbody></table>
          {!transit.length && <p className="p-6 text-center text-sm text-muted-foreground">Nothing in transit.</p>}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4"><p className="font-bold">My team ({people.length})</p><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, state" aria-label="Search team" className="h-10 w-64 rounded-md border bg-background px-3 text-sm" /></div>
          <table className="enterprise-table"><thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>State</th></tr></thead>
            <tbody>{rows.map((p) => <tr key={p.user_id}><td className="font-bold">{p.full_name || "—"}</td><td className="font-mono">{p.phone ? `+91 ${p.phone}` : "—"}</td><td>{(p.roles ?? []).map((r) => ROLE_LABEL[r] ?? r).join(", ")}</td><td>{(p.states ?? []).join(", ") || "—"}</td></tr>)}</tbody></table>
          {!rows.length && <p className="p-6 text-center text-sm text-muted-foreground">No team members in your scope yet.</p>}
        </div>
      )}
    </section>
  );
}
