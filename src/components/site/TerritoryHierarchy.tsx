import { lazy, Suspense, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { assignAreaPins } from "@/lib/staff.functions";
import { INDIAN_STATES } from "@/lib/india-regions";
import { ROLE_LABEL } from "@/hooks/use-roles";

const TerritoryMap = lazy(() => import("@/components/site/TerritoryMap"));
type Alloc = { id: string; pincode: string; holder_user_id: string; holder_role: string; status: string; area: string | null };
type Staff = { user_id: string; full_name: string | null; phone: string | null; roles: string[] };

/** Area manager → hubs → PIN tree, area-wide PIN assignment, PIN owner lookup and map. */
export function TerritoryHierarchy() {
  const qc = useQueryClient();
  const assign = useServerFn(assignAreaPins);
  const { data: staff = [] } = useQuery({ queryKey: ["staff-dir"], queryFn: async () => ((await supabase.rpc("staff_directory")).data ?? []) as Staff[] });
  const { data: allocs = [] } = useQuery({ queryKey: ["allocations-active"], queryFn: async () => ((await supabase.from("pincode_allocations").select("id,pincode,holder_user_id,holder_role,status,area").eq("status", "active").limit(1000)).data ?? []) as Alloc[] });
  const name = (id: string) => staff.find((s) => s.user_id === id)?.full_name || id.slice(0, 8);
  const pinsOf = (id: string) => allocs.filter((a) => a.holder_user_id === id).map((a) => a.pincode);

  const tree = useMemo(() => {
    const managers = staff.filter((s) => s.roles.includes("area_manager"));
    const hubs = staff.filter((s) => s.roles.includes("point"));
    return managers.map((m) => {
      const mp = new Set(pinsOf(m.user_id));
      return { m, pins: [...mp], hubs: hubs.filter((h) => pinsOf(h.user_id).some((p) => mp.has(p))) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, allocs]);

  const [f, setF] = useState({ user: "", state: "", area: "" });
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const hits = q.length === 6 ? allocs.filter((a) => a.pincode === q) : [];
  const mapPoints = allocs.slice(0, 150).map((a) => ({ pincode: a.pincode, label: `${name(a.holder_user_id)} · ${ROLE_LABEL[a.holder_role] ?? a.holder_role}` }));
  const picked = staff.find((s) => s.user_id === f.user);
  const role = picked?.roles.find((r) => r !== "admin") ?? "area_manager";

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-2xl border bg-card p-5">
        <p className="flex items-center gap-2 font-bold"><Search className="h-5 w-5 text-primary" />Find who handles a PIN code</p>
        <input inputMode="numeric" maxLength={6} value={q} onChange={(e) => setQ(e.target.value.replace(/\D/g, ""))} placeholder="6-digit PIN e.g. 302017" className="mt-3 h-11 w-full rounded-xl border bg-background px-3 font-mono" />
        {q.length === 6 && (hits.length ? <ul className="mt-3 space-y-1 text-sm">{hits.map((h) => <li key={h.id} className="rounded-lg bg-muted px-3 py-2"><b>{ROLE_LABEL[h.holder_role] ?? h.holder_role}:</b> {name(h.holder_user_id)}{h.area ? ` · ${h.area}` : ""}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No one is appointed to this PIN yet.</p>)}
      </div>

      <form className="grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-4" onSubmit={async (e) => {
        e.preventDefault(); if (!f.user || !f.state) { toast.error("Pick a person and state"); return; }
        setBusy(true);
        try { const r = await assign({ data: { ...f, role } }); toast.success(`${r.added} of ${r.found} PIN codes added`); qc.invalidateQueries(); }
        catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
      }}>
        <p className="flex items-center gap-2 font-bold md:col-span-4"><MapPin className="h-5 w-5 text-primary" />Give an area — all its PIN codes are added automatically</p>
        <select className="h-11 rounded-xl border bg-background px-3 text-sm" value={f.user} onChange={(e) => setF({ ...f, user: e.target.value })}><option value="">— staff member —</option>{staff.filter((s) => s.roles.some((r) => r !== "admin")).map((s) => <option key={s.user_id} value={s.user_id}>{s.full_name || s.phone} · {s.roles.map((r) => ROLE_LABEL[r] ?? r).join(", ")}</option>)}</select>
        <select className="h-11 rounded-xl border bg-background px-3 text-sm" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}><option value="">— state —</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select>
        <input required minLength={2} className="h-11 rounded-xl border bg-background px-3 text-sm" placeholder="City / district / area e.g. Jaipur" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} />
        <Button type="submit" className="h-11" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add area PINs"}</Button>
      </form>

      <div className="rounded-2xl border bg-card p-5">
        <p className="font-bold">Area managers and their hubs</p>
        {tree.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No area managers yet. Create one in the Users tab.</p>}
        <div className="mt-3 space-y-3">{tree.map(({ m, pins, hubs }) => (
          <details key={m.user_id} className="rounded-xl border p-3">
            <summary className="cursor-pointer font-bold">{m.full_name || m.phone} <span className="text-xs font-normal text-muted-foreground">· {pins.length} PINs · {hubs.length} hubs</span></summary>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{pins.slice(0, 60).join(", ")}{pins.length > 60 ? " …" : ""}</p>
            <ul className="mt-2 space-y-1">{hubs.map((h) => <li key={h.user_id} className="rounded-lg bg-muted px-3 py-2 text-sm"><b>{h.full_name || h.phone}</b> <span className="font-mono text-xs">{pinsOf(h.user_id).join(", ")}</span></li>)}</ul>
          </details>
        ))}</div>
      </div>

      <ClientOnly fallback={<div className="h-[420px] rounded-2xl border bg-muted" />}><Suspense fallback={<div className="h-[420px] rounded-2xl border bg-muted" />}><TerritoryMap points={mapPoints} /></Suspense></ClientOnly>
    </div>
  );
}
