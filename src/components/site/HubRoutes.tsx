import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/** Connecting routes between hubs/clusters. Bags can only be dispatched on a listed route (once any route exists). */
export function HubRoutes() {
  const qc = useQueryClient();
  const [f, setF] = useState({ from: "", to: "", pins: "" });
  const { data: rows = [] } = useQuery({ queryKey: ["hub-routes"], queryFn: async () => (await supabase.from("hub_routes").select("*").order("created_at", { ascending: false })).data ?? [] });
  const refresh = () => qc.invalidateQueries({ queryKey: ["hub-routes"] });
  const add = async () => {
    const pincodes = [...new Set(f.pins.split(/[\s,]+/).filter((p) => /^\d{6}$/.test(p)))];
    const { data: u } = await supabase.auth.getUser();
    const r = await supabase.from("hub_routes").insert({ from_location: f.from.trim(), to_location: f.to.trim(), pincodes, created_by: u.user?.id ?? null, owner_user_id: u.user?.id ?? null });
    if (r.error) toast.error(r.error.message.includes("row-level") ? "Only network, area, state managers or admin can create routes." : r.error.message); else { toast.success("Route saved"); setF({ from: "", to: "", pins: "" }); refresh(); }
  };
  const inp = "h-11 rounded-md border bg-card px-3";
  return <div>
    <form className="mb-5 grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]" onSubmit={(e) => { e.preventDefault(); add(); }}>
      <input required aria-label="From location" placeholder="From hub / city" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className={inp} />
      <input required aria-label="To location" placeholder="To hub / city" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className={inp} />
      <input aria-label="PIN codes served" placeholder="PIN codes served (comma separated, many allowed)" value={f.pins} onChange={(e) => setF({ ...f, pins: e.target.value })} className={inp} />
      <Button type="submit">Add route</Button>
    </form>
    <div className="overflow-x-auto rounded-lg border bg-card"><table className="enterprise-table"><thead><tr><th>Route</th><th>PIN codes</th><th>Status</th><th /></tr></thead><tbody>
      {rows.map((r) => <tr key={r.id}><td className="font-bold">{r.from_location} ⇄ {r.to_location}</td><td className="max-w-md break-words text-xs">{r.pincodes.join(", ") || "—"}</td><td>{r.active ? "Active" : "Off"}</td><td><Button variant="outline" size="sm" onClick={async () => { const x = await supabase.from("hub_routes").update({ active: !r.active }).eq("id", r.id); if (x.error) toast.error(x.error.message); else refresh(); }}>{r.active ? "Turn off" : "Turn on"}</Button></td></tr>)}
    </tbody></table>{!rows.length && <p className="p-8 text-center text-muted-foreground">No routes yet — until you add one, bags can go anywhere.</p>}</div>
  </div>;
}
