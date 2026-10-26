import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Ticket } from "lucide-react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  head: () => ({ meta: [{ title: "Offers & coupons — Get Xpress" }, { name: "description", content: "Create and manage Get Xpress shipping coupons." }, { property: "og:title", content: "Offers & coupons — Get Xpress" }, { property: "og:description", content: "Create and manage Get Xpress shipping coupons." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Coupons,
});

function Coupons() {
  const { isAdmin } = useRoles();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["coupons"], queryFn: async () => (await supabase.from("coupons").select("*").eq("is_private_reward", false).order("created_at", { ascending: false })).data ?? [] });
  const { data: rewards } = useQuery({ queryKey: ["reward-stats"], queryFn: async () => (await supabase.rpc("reward_stats")).data as { sent: number; claimed: number } | null });
  const [f, setF] = useState({ code: "", description: "", discount_type: "percent", discount_value: "10", max_discount: "", min_order: "0", max_uses: "", per_user_limit: "1", expires_at: "" });
  const save = async () => {
    if (!/^[A-Z0-9]{3,30}$/.test(f.code)) { toast.error("Code: 3–30 letters/numbers"); return; }
    const { error } = await supabase.from("coupons").insert({
      code: f.code, description: f.description || null, discount_type: f.discount_type, discount_value: Number(f.discount_value),
      max_discount: f.max_discount ? Number(f.max_discount) : null, min_order: Number(f.min_order) || 0,
      max_uses: f.max_uses ? Number(f.max_uses) : null, per_user_limit: Number(f.per_user_limit) || 1,
      // A date-only expiry means "valid through the end of that day" (India time).
      expires_at: f.expires_at ? new Date(`${f.expires_at}T23:59:59+05:30`).toISOString() : null,
    });
    if (error) toast.error(error.message); else { toast.success("Coupon created"); setF({ ...f, code: "", description: "" }); qc.invalidateQueries({ queryKey: ["coupons"] }); }
  };
  const toggle = async (id: string, active: boolean) => { await supabase.from("coupons").update({ active }).eq("id", id); qc.invalidateQueries({ queryKey: ["coupons"] }); };
  const remove = async (id: string, code: string) => { if (!confirm(`Delete coupon ${code}?`)) return; const { error } = await supabase.from("coupons").delete().eq("id", id); if (error) toast.error(error.message); else { toast.success("Coupon deleted"); qc.invalidateQueries({ queryKey: ["coupons"] }); } };
  const [edit, setEdit] = useState<{ id: string; description: string; discount_value: string; max_discount: string; min_order: string; max_uses: string } | null>(null);
  const saveEdit = async () => { if (!edit) return; const { error } = await supabase.from("coupons").update({ description: edit.description || null, discount_value: Number(edit.discount_value), max_discount: edit.max_discount ? Number(edit.max_discount) : null, min_order: Number(edit.min_order) || 0, max_uses: edit.max_uses ? Number(edit.max_uses) : null }).eq("id", edit.id); if (error) toast.error(error.message); else { toast.success("Coupon updated"); setEdit(null); qc.invalidateQueries({ queryKey: ["coupons"] }); } };
  const inp = "h-11 rounded-xl border bg-background px-3 text-sm font-semibold outline-none";
  return (
    <AppShell wide>
      <PageHeader title="Offers & coupons" sub="Discounts are re-checked on the server at booking time." />
      <div className="mb-4 rounded-xl border bg-card p-4 text-sm"><b>Automatic first-delivery reward (10% off)</b><p className="text-muted-foreground">Sent by email after a customer's first parcel is delivered. Codes stay private.</p><p className="mt-1">Sent: <b>{rewards?.sent ?? 0}</b> · Claimed: <b>{rewards?.claimed ?? 0}</b></p></div>
      {isAdmin && (
        <div className="mb-6 rounded-3xl border bg-card p-5">
          <p className="font-bold">New coupon</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <input className={inp} placeholder="CODE" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} />
            <select className={inp} value={f.discount_type} onChange={(e) => setF({ ...f, discount_type: e.target.value })}><option value="percent">% off</option><option value="flat">₹ flat off</option></select>
            <input className={inp} placeholder="Value" inputMode="decimal" value={f.discount_value} onChange={(e) => setF({ ...f, discount_value: e.target.value })} />
            <input className={inp} placeholder="Max discount ₹" value={f.max_discount} onChange={(e) => setF({ ...f, max_discount: e.target.value })} />
            <input className={inp} placeholder="Min order ₹" value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} />
            <input className={inp} placeholder="Total uses (blank = ∞)" value={f.max_uses} onChange={(e) => setF({ ...f, max_uses: e.target.value })} />
            <input className={inp} placeholder="Uses per user" value={f.per_user_limit} onChange={(e) => setF({ ...f, per_user_limit: e.target.value })} />
            <input className={inp} type="date" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} />
            <input className={`${inp} sm:col-span-2`} placeholder="Description shown to customers" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <button onClick={save} className="mt-3 h-11 rounded-xl bg-primary px-6 font-bold text-primary-foreground">Create coupon</button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((c) => (
          <div key={c.id} className={`rounded-3xl border-2 border-dashed bg-card p-5 ${c.active ? "border-primary" : "opacity-50"}`}>
            <div className="flex items-center justify-between"><p className="font-mono text-2xl font-extrabold">{c.code}</p><Ticket className="h-6 w-6 text-primary" /></div>
            <p className="mt-1 font-bold">{c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}{c.max_discount ? ` (max ₹${c.max_discount})` : ""}</p>
            <p className="text-sm text-muted-foreground">{c.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">Min ₹{c.min_order} · used {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""} · {c.expires_at ? `till ${new Date(c.expires_at).toLocaleDateString("en-IN")}` : "no expiry"}</p>
            {isAdmin && edit?.id === c.id && <div className="mt-3 grid grid-cols-2 gap-2">
              <input className={inp} placeholder="Value" value={edit.discount_value} onChange={(e) => setEdit({ ...edit, discount_value: e.target.value })} />
              <input className={inp} placeholder="Max discount ₹" value={edit.max_discount} onChange={(e) => setEdit({ ...edit, max_discount: e.target.value })} />
              <input className={inp} placeholder="Min order ₹" value={edit.min_order} onChange={(e) => setEdit({ ...edit, min_order: e.target.value })} />
              <input className={inp} placeholder="Total uses" value={edit.max_uses} onChange={(e) => setEdit({ ...edit, max_uses: e.target.value })} />
              <input className={`${inp} col-span-2`} placeholder="Description" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              <button onClick={saveEdit} className="h-10 rounded-xl bg-primary text-xs font-bold text-primary-foreground">Save</button>
              <button onClick={() => setEdit(null)} className="h-10 rounded-xl border text-xs font-bold">Cancel</button>
            </div>}
            {isAdmin && <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => toggle(c.id, !c.active)} className="rounded-xl border px-3 py-1.5 text-xs font-bold">{c.active ? "Deactivate" : "Activate"}</button>
              <button onClick={() => setEdit({ id: c.id, description: c.description ?? "", discount_value: String(c.discount_value), max_discount: c.max_discount == null ? "" : String(c.max_discount), min_order: String(c.min_order), max_uses: c.max_uses == null ? "" : String(c.max_uses) })} className="rounded-xl border px-3 py-1.5 text-xs font-bold">Edit</button>
              <button onClick={() => remove(c.id, c.code)} className="rounded-xl border border-destructive px-3 py-1.5 text-xs font-bold text-destructive">Delete</button>
            </div>}
          </div>
        ))}
        {data.length === 0 && <p className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground sm:col-span-3">No coupons yet.</p>}
      </div>
    </AppShell>
  );
}
