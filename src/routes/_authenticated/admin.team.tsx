import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { AppShell, PageHeader, Stat } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/admin/team")({
  head: () => ({ meta: [{ title: "Users — Get Xpress Admin" }, { name: "description", content: "All users with phone, roles and last seen." }, { property: "og:title", content: "Users — Get Xpress Admin" }, { property: "og:description", content: "User management and last seen." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Team,
});

const ago = (d: string | null) => { if (!d) return "Never"; const m = Math.round((Date.now() - new Date(d).getTime()) / 60000); return m < 2 ? "Online" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

function Team() {
  const [q, setQ] = useState(""), [role, setRole] = useState("all");
  const { data = [], error } = useQuery({ queryKey: ["admin-users"], refetchInterval: 60000, queryFn: async () => { const r = await supabase.rpc("admin_users"); if (r.error) throw r.error; return r.data ?? []; } });
  const list = useMemo(() => data.filter((u) => (role === "all" || (role === "customer" ? u.roles.length === 0 : u.roles.includes(role))) && (!q || [u.full_name, u.phone, u.city].join(" ").toLowerCase().includes(q.toLowerCase()))), [data, q, role]);
  const online = data.filter((u) => u.last_seen_at && Date.now() - new Date(u.last_seen_at).getTime() < 15 * 60000).length;
  const exportXlsx = async () => { const X = await import("xlsx"); const ws = X.utils.json_to_sheet(list.map((u) => ({ name: u.full_name, phone: u.phone, city: u.city, roles: u.roles.join(", "), last_seen: u.last_seen_at, joined: u.created_at }))); const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, "users"); X.writeFile(wb, "getxpress-users.xlsx"); };
  return (
    <AppShell wide>
      <PageHeader title="Users & last seen" sub="Every account is identified by its mobile number." action={<Button variant="outline" onClick={exportXlsx}><Download /> Export Excel</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={data.length} tone="ink" /><Stat label="Active 15 min" value={online} tone="lime" />
        <Stat label="Staff" value={data.filter((u) => u.roles.length).length} tone="primary" /><Stat label="Customers" value={data.filter((u) => !u.roles.length).length} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-xl border bg-card px-3"><Search className="h-4 w-4" /><input aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, city" className="flex-1 bg-transparent outline-none" /></label>
        <select aria-label="Filter role" value={role} onChange={(e) => setRole(e.target.value)} className="h-11 rounded-xl border bg-card px-3"><option value="all">All roles</option><option value="customer">Customers</option>{Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      {error && <p className="mt-4 text-destructive">{(error as Error).message}</p>}
      <div className="mt-4 overflow-x-auto rounded-2xl border bg-card">
        <table className="enterprise-table"><thead><tr><th>Name</th><th>Phone (ID)</th><th>City</th><th>Roles</th><th>Last seen</th><th>Joined</th></tr></thead>
          <tbody>{list.map((u) => <tr key={u.user_id}><td className="font-bold">{u.full_name ?? "—"}</td><td className="font-mono">{u.phone ?? "—"}</td><td>{u.city ?? "—"}</td><td>{u.roles.length ? u.roles.map((r) => ROLE_LABEL[r] ?? r).join(", ") : "Customer"}</td><td>{ago(u.last_seen_at)}</td><td>{new Date(u.created_at).toLocaleDateString("en-IN")}</td></tr>)}</tbody></table>
      </div>
    </AppShell>
  );
}
