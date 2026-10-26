import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import { services, type ServiceLevel } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/team-prices")({
  head: () => ({ meta: [{ title: "Team prices — Get Xpress" }, { name: "description", content: "State teams set their own delivery prices." }, { property: "og:title", content: "Get Xpress team prices" }, { property: "og:description", content: "State-level delivery price controls." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: TeamPrices,
});

function TeamPrices() {
  const { isAdmin, roles } = useRoles();
  const canEdit = isAdmin || roles.includes("state_director") || roles.includes("state_manager");
  const qc = useQueryClient();
  const { data: myStates = [] } = useQuery({
    queryKey: ["my-states"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const r = await supabase.from("staff_scopes").select("state").eq("user_id", u.user?.id ?? "").is("revoked_at", null).not("state", "is", null);
      return [...new Set((r.data ?? []).map((x) => x.state as string))];
    },
  });
  const [state, setState] = useState("");
  useEffect(() => { if (!state && myStates[0]) setState(myStates[0]); }, [myStates, state]);
  const { data: national = [] } = useQuery({ queryKey: ["admin-rates"], queryFn: async () => (await supabase.from("service_rates").select("*")).data ?? [] });
  const { data: team = [] } = useQuery({ queryKey: ["state-rates", state], enabled: !!state, queryFn: async () => (await supabase.from("state_rates").select("*").eq("state", state)).data ?? [] });

  const save = async (service: string, base: number, per_kg: number, active: boolean) => {
    if (base < 0 || per_kg < 0) { toast.error("Prices cannot be negative."); return; }
    const { data: u } = await supabase.auth.getUser();
    const r = await supabase.from("state_rates").upsert({ state, service, base, per_kg, active, set_by: u.user?.id ?? null, updated_at: new Date().toISOString() });
    if (r.error) toast.error(r.error.message.includes("row-level") ? "You can only set prices for your own state." : r.error.message);
    else { toast.success(`${state} price saved`); qc.invalidateQueries({ queryKey: ["state-rates", state] }); }
  };
  const reset = async (service: string) => {
    const r = await supabase.from("state_rates").delete().eq("state", state).eq("service", service);
    if (r.error) toast.error(r.error.message); else { toast.success("Back to national price"); qc.invalidateQueries({ queryKey: ["state-rates", state] }); }
  };

  return (
    <AppShell wide>
      <PageHeader title="Team prices" sub="Prices for bookings picked up in a state. Without a team price, the national price applies." />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input list="states" value={state} onChange={(e) => setState(e.target.value)} placeholder={isAdmin ? "Type a state, e.g. Rajasthan" : "Your state"} aria-label="State" className="h-11 w-72 rounded-md border bg-card px-3" />
        <datalist id="states">{myStates.map((s) => <option key={s} value={s} />)}</datalist>
        {!canEdit && <p className="text-sm text-muted-foreground">View only — state managers and directors can change prices.</p>}
      </div>
      {state && (
        <div className="grid gap-4 md:grid-cols-3">
          {national.map((n) => {
            const t = team.find((x) => x.service === n.service);
            return (
              <form key={`${n.service}-${t?.updated_at ?? "n"}`} className="rounded-lg border bg-card p-5" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save(n.service, Number(f.get("base")), Number(f.get("per_kg")), f.get("active") === "on"); }}>
                <h2 className="font-bold">{services[n.service as ServiceLevel]?.label ?? n.service}</h2>
                <p className="text-xs text-muted-foreground">National: ₹{Number(n.base)} + ₹{Number(n.per_kg)}/kg</p>
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${t ? "bg-primary/10 text-primary" : "bg-muted"}`}>{t ? "Team price active" : "Using national price"}</span>
                <label className="mt-4 block text-sm">Base (₹)<input disabled={!canEdit} name="base" type="number" min="0" step="0.01" defaultValue={Number(t?.base ?? n.base)} className="mt-1 h-11 w-full rounded-md border bg-background px-3" /></label>
                <label className="mt-3 block text-sm">Per extra kg (₹)<input disabled={!canEdit} name="per_kg" type="number" min="0" step="0.01" defaultValue={Number(t?.per_kg ?? n.per_kg)} className="mt-1 h-11 w-full rounded-md border bg-background px-3" /></label>
                <label className="my-3 flex items-center gap-2 text-sm"><input disabled={!canEdit} name="active" type="checkbox" defaultChecked={t?.active ?? n.active} /> Service on in {state}</label>
                {canEdit && <div className="flex gap-2"><Button type="submit">Save</Button>{t && <Button type="button" variant="ghost" onClick={() => reset(n.service)}>Reset</Button>}</div>}
              </form>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
