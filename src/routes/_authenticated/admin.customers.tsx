import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppShell, PageHeader, Stat } from "@/components/site/AppShell";
import { DataGrid, type Col } from "@/components/site/DataGrid";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import { isSyntheticEmail } from "@/lib/india-regions";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => ({ meta: [
    { title: "Customer records — GetXpress Admin" },
    { name: "description", content: "Search, filter, sort and export every customer with their order count and spend." },
    { property: "og:title", content: "GetXpress customer records" },
    { property: "og:description", content: "Spreadsheet-style customer CRM for GetXpress admins." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Customers,
});

type Row = { id: string; name: string; phone: string; email: string; city: string; district: string; state: string; pincode: string; type: string; orders: number; spend: number; last_order: string; joined: string; last_seen: string; verified: string };

function Customers() {
  const { isAdmin } = useRoles();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Row | null>(null);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["crm-customers"], enabled: isAdmin,
    queryFn: async () => {
      const [p, s] = await Promise.all([
        supabase.from("profiles").select("id,full_name,phone,contact_email,city,district,state,pincode,account_type,created_at,last_seen_at,phone_verified").order("created_at", { ascending: false }).limit(5000),
        supabase.from("shipments").select("user_id,price,created_at,status").limit(20000),
      ]);
      const agg = new Map<string, { n: number; sum: number; last: string }>();
      for (const r of s.data ?? []) { if (!r.user_id) continue; const a = agg.get(r.user_id) ?? { n: 0, sum: 0, last: "" }; a.n++; if (r.status !== "cancelled") a.sum += Number(r.price); if (r.created_at > a.last) a.last = r.created_at; agg.set(r.user_id, a); }
      const d = (v: string | null) => (v ? new Date(v).toLocaleDateString("en-IN") : "");
      return (p.data ?? []).map((u): Row => { const a = agg.get(u.id); const email = isSyntheticEmail(u.contact_email) ? "" : (u.contact_email ?? ""); return { id: u.id, name: u.full_name ?? "", phone: u.phone ?? "", email, city: u.city ?? "", district: u.district ?? "", state: u.state ?? "", pincode: u.pincode ?? "", type: u.account_type, orders: a?.n ?? 0, spend: Math.round(a?.sum ?? 0), last_order: d(a?.last ?? null), joined: d(u.created_at), last_seen: d(u.last_seen_at), verified: u.phone_verified ? "Yes" : "No" }; });
    },
  });
  if (!isAdmin) return <AppShell><p>Admin access required.</p></AppShell>;
  const cols: Col<Row>[] = [
    { key: "id", label: "Edit", render: (r) => <Button size="sm" variant="outline" onClick={() => setEdit(r)}>Edit</Button> },
    { key: "name", label: "Name", width: "160px" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email", render: (r) => r.email || <span className="text-muted-foreground">Mobile-only account</span> },
    { key: "city", label: "City / town" }, { key: "district", label: "District" }, { key: "state", label: "State" }, { key: "pincode", label: "PIN" },
    { key: "type", label: "Type" }, { key: "orders", label: "Orders" }, { key: "spend", label: "Spend ₹", render: (r) => r.spend.toLocaleString("en-IN") },
    { key: "last_order", label: "Last order" }, { key: "joined", label: "Joined" }, { key: "last_seen", label: "Last seen" }, { key: "verified", label: "Verified" },
  ];
  const active = rows.filter((r) => r.orders > 0).length;
  return (
    <AppShell wide>
      <PageHeader title="Customer records" sub="Click Edit on any row to change a user's details. Sort by column, tick rows to export." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Customers" value={rows.length} tone="ink" />
        <Stat label="Have ordered" value={active} />
        <Stat label="Total spend ₹" value={rows.reduce((a, r) => a + r.spend, 0).toLocaleString("en-IN")} tone="lime" />
        <Stat label="Phone verified" value={rows.filter((r) => r.verified === "Yes").length} tone="primary" />
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : <DataGrid name="getxpress-customers" rows={rows} cols={cols} rowKey={(r) => r.id} />}
      {edit && <EditCustomer row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["crm-customers"] }); }} />}
    </AppShell>
  );
}

function EditCustomer({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ full_name: row.name, phone: row.phone, contact_email: row.email, city: row.city, district: row.district, state: row.state, pincode: row.pincode, account_type: row.type });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_update_profile", { _id: row.id, _patch: f });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Customer updated"); onSaved(); }
  };
  const field = (k: keyof typeof f, label: string) => <label className="block text-xs font-semibold">{label}<input value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>;
  return (
    <div role="dialog" aria-label="Edit customer" className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-bold">Edit customer</h2>
        <div className="grid gap-3 sm:grid-cols-2">{field("full_name", "Name")}{field("phone", "Phone")}{field("contact_email", "Email")}{field("city", "City / town")}{field("district", "District")}{field("state", "State")}{field("pincode", "PIN")}{field("account_type", "Type")}</div>
        <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>Save</Button></div>
      </div>
    </div>
  );
}
