import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { manageStaff } from "@/lib/staff.functions";
import { PinAutocomplete } from "@/components/site/PinAutocomplete";
import { CreateStaffAccount } from "@/components/site/CreateStaffAccount";
import { pinInfo } from "@/lib/pin-lookup";
import { lazy, Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import { INDIAN_STATES } from "@/lib/india-regions";
import type { Database } from "@/integrations/supabase/types";

const TerritoryMap = lazy(() => import("@/components/site/TerritoryMap"));
type Role = Database["public"]["Enums"]["app_role"];
const ROLES: { v: Role; l: string }[] = [
  { v: "area_manager", l: "Area manager" }, { v: "point", l: "Hub" }, { v: "state_manager", l: "State manager" }, { v: "network", l: "Network partner" }, { v: "state_director", l: "State director" },
];

export const Route = createFileRoute("/_authenticated/admin/staff")({
  head: () => ({ meta: [
    { title: "Staff assignment — GetXpress Admin" }, { name: "description", content: "Assign staff to a state, area and hub PIN code, and see coverage on a map." },
    { property: "og:title", content: "GetXpress staff assignment" }, { property: "og:description", content: "Assign staff to PIN codes." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: StaffAssign,
});

function StaffAssign() {
  const { isAdmin, roles } = useRoles();
  const qc = useQueryClient();
  const manage=useServerFn(manageStaff);
  const [saving,setSaving]=useState(false);
  const [user, setUser] = useState(""), [q, setQ] = useState(""), [role, setRole] = useState<Role>("area_manager"), [state, setState] = useState(""), [area, setArea] = useState(""), [pin, setPin] = useState("");
  const { data: people = [] } = useQuery({ queryKey: ["staff-people", q], enabled: isAdmin, queryFn: async () => {
    let s = supabase.from("profiles").select("id, full_name, phone, city").order("created_at", { ascending: false }).limit(30);
    const safe=q.replace(/[^a-zA-Z0-9 ]/g,"").trim().slice(0,80);
    if (safe) s = s.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%`);
    return (await s).data ?? [];
  } });
  const { data: allocs = [] } = useQuery({ queryKey: ["allocs"], queryFn: async () => (await supabase.from("pincode_allocations").select("id, pincode, area, holder_role, holder_user_id, status").eq("status", "active").order("created_at", { ascending: false }).limit(500)).data ?? [] });
  const ids = [...new Set(allocs.map((a) => a.holder_user_id))];
  const { data: names = {} } = useQuery({ queryKey: ["alloc-names", ids.join()], enabled: ids.length > 0, queryFn: async () => Object.fromEntries(((await supabase.from("profiles").select("id, full_name, phone").in("id", ids)).data ?? []).map((p) => [p.id, p.full_name || p.phone || p.id.slice(0, 8)])) as Record<string, string> });
  const points = useMemo(() => allocs.map((a) => ({ pincode: a.pincode, label: `${names[a.holder_user_id] ?? "Staff"} · ${a.holder_role.replace("_", " ")}${a.area ? ` · ${a.area}` : ""}` })), [allocs, names]);
  const canView = isAdmin || roles.includes("area_manager") || roles.includes("state_manager") || roles.includes("state_director");

  const assign = async () => {
    if (!user) return toast.error("Select a user");
    if (!state) return toast.error("Select a state");
    if (!/^\d{6}$/.test(pin)) return toast.error("Enter a 6-digit hub PIN");
    setSaving(true);
    try {
      const info=await pinInfo(pin);
      if(!info) return toast.error("City/State not found for this pincode");
      if(info.state!==state) return toast.error("Hub PIN does not match the selected state");
      // Add missing local-directory PINs using the existing authorized PIN master.
      const p=await supabase.from("pincodes").select("pincode").eq("pincode",pin).maybeSingle();
      if(!p.data){const r=await supabase.from("pincodes").insert({pincode:pin,city:info.city,state:info.state,area:area||info.areas?.[0]||info.city});if(r.error)throw r.error;}
      await manage({data:{user,role:role as "point"|"network"|"state_manager"|"state_director"|"area_manager",enabled:true,state,area,pin}});
      toast.success("Staff position and territory saved");qc.invalidateQueries();
    }catch(e){toast.error((e as Error).message);}finally{setSaving(false);}
    return undefined;
  };
  const remove = async (id: string) => { const r = await supabase.from("pincode_allocations").update({ status: "ended", effective_to: new Date().toISOString().slice(0,10) }).eq("id", id); if (r.error) toast.error(r.error.message); else qc.invalidateQueries({ queryKey: ["allocs"] }); };
  const disable=async(holder:string,r:string)=>{if(r==="admin")return;try{await manage({data:{user:holder,role:r as "point"|"network"|"state_manager"|"state_director"|"area_manager",enabled:false}});toast.success("Position disabled");qc.invalidateQueries();}catch(e){toast.error((e as Error).message);}};

  if (!canView) return <AppShell><p>You don't have access to this page.</p></AppShell>;
  const field = "mt-1 h-11 w-full rounded-xl border bg-background px-3";
  return (
    <AppShell wide>
      <PageHeader title={isAdmin ? "Staff assignment" : "My territory"} sub={isAdmin ? "Pick a user, their role, state, area and hub PIN." : "PIN codes and staff assigned in your area."} />
      {isAdmin && <CreateStaffAccount />}
      {isAdmin && <div className="grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-3">
        <label className="text-xs font-bold md:col-span-1">1. Find user<input className={field} placeholder="Name or phone" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="text-xs font-bold md:col-span-2">Select user<select aria-label="User" className={field} value={user} onChange={(e) => setUser(e.target.value)}><option value="">— choose —</option>{people.map((p) => <option key={p.id} value={p.id}>{p.full_name || "Unnamed"} · {p.phone ?? ""} {p.city ? `· ${p.city}` : ""}</option>)}</select></label>
        <label className="text-xs font-bold">2. Role<select className={field} value={role} onChange={(e) => setRole(e.target.value as Role)}>{ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select></label>
        <label className="text-xs font-bold">3. State<select className={field} value={state} onChange={(e) => setState(e.target.value)}><option value="">— state —</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="text-xs font-bold">4. Area name<input className={field} maxLength={80} value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Malviya Nagar" /></label>
        <PinAutocomplete label="5. Hub PIN / area" value={pin} onChange={setPin} onPick={h=>{setPin(h.pincode);setState(h.state);if(!area)setArea(h.areas?.[0]||h.city);}}/>
        <div className="flex items-end md:col-span-2"><Button className="h-11" disabled={saving} onClick={assign}>{saving?"Saving…":"Save assignment"}</Button></div>
      </div>}
      <div className="mt-5"><ClientOnly fallback={<div className="h-[420px] rounded-2xl border bg-muted" />}><Suspense fallback={<div className="h-[420px] rounded-2xl border bg-muted" />}><TerritoryMap points={points} /></Suspense></ClientOnly></div>
      <div className="mt-5 overflow-x-auto rounded-2xl border bg-card"><table className="enterprise-table"><thead><tr><th>PIN</th><th>Area</th><th>Staff</th><th>Role</th>{isAdmin && <th />}</tr></thead><tbody>
        {allocs.map((a) => <tr key={a.id}><td className="font-mono">{a.pincode}</td><td>{a.area ?? "—"}</td><td>{names[a.holder_user_id] ?? a.holder_user_id.slice(0, 8)}</td><td className="capitalize">{a.holder_role.replace("_", " ")}</td>{isAdmin && <td><Button size="sm" variant="ghost" onClick={()=>{setUser(a.holder_user_id);setRole(a.holder_role);setPin(a.pincode);setArea(a.area??"");void pinInfo(a.pincode).then(h=>{if(h)setState(h.state);});window.scrollTo({top:0,behavior:"smooth"});}}>Edit</Button><Button size="sm" variant="ghost" onClick={() => remove(a.id)}>Release PIN</Button><Button size="sm" variant="outline" onClick={()=>disable(a.holder_user_id,a.holder_role)}>Disable position</Button></td>}</tr>)}
      </tbody></table>{allocs.length === 0 && <p className="p-8 text-center text-muted-foreground">No PIN codes assigned yet.</p>}</div>
    </AppShell>
  );
}
