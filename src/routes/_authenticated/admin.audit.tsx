import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [
    { title: "Audit log — GetXpress" },
    { name: "description", content: "Live history of order updates, role changes, provider switches and parcel scans." },
    { property: "og:title", content: "Audit log — GetXpress" },
    { property: "og:description", content: "Who changed what, and when." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AuditPage,
});

const LABEL: Record<string, string> = { shipments: "Order", user_roles: "Role", courier_provider_settings: "Courier provider", whatsapp_settings: "WhatsApp", shipment_pieces: "Parcel scan" };

function AuditPage() {
  const qc = useQueryClient(); const [entity, setEntity] = useState("");
  const { data: rows = [], error } = useQuery({
    queryKey: ["audit", entity],
    queryFn: async () => {
      let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
      if (entity) q = q.eq("entity", entity);
      const { data, error } = await q; if (error) throw error;
      const ids = [...new Set(data.map((r) => r.actor).filter(Boolean))] as string[];
      const { data: people } = ids.length ? await supabase.from("profiles").select("id,full_name,phone").in("id", ids) : { data: [] };
      const who = new Map((people ?? []).map((p) => [p.id, p.full_name || p.phone || p.id.slice(0, 8)]));
      return data.map((r) => ({ ...r, who: r.actor ? who.get(r.actor) ?? r.actor.slice(0, 8) : "System" }));
    },
  });
  useEffect(() => {
    const ch = supabase.channel("audit-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => qc.invalidateQueries({ queryKey: ["audit"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  const summary = (m: unknown) => {
    const changes = (m as { changes?: Record<string, { from: unknown; to: unknown }> })?.changes;
    if (changes) return Object.entries(changes).slice(0, 4).map(([k, v]) => `${k}: ${String(v.from ?? "—")} → ${String(v.to ?? "—")}`).join(" · ");
    const row = (m as { row?: Record<string, unknown> })?.row; return row ? Object.entries(row).filter(([k]) => ["role", "provider", "enabled", "status"].includes(k)).map(([k, v]) => `${k}: ${String(v)}`).join(" · ") : "";
  };
  return (
    <AppShell wide>
      <PageHeader title="Audit log" sub="Updates appear here live." action={<select value={entity} onChange={(e) => setEntity(e.target.value)} className="h-10 rounded-xl border bg-card px-3 text-sm font-bold"><option value="">Everything</option>{Object.entries(LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>} />
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">When</th><th>Who</th><th>What</th><th>Details</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id} className="border-t align-top"><td className="whitespace-nowrap p-3">{new Date(r.created_at).toLocaleString("en-IN")}</td><td className="font-semibold">{r.who}</td><td className="whitespace-nowrap capitalize">{LABEL[r.entity] ?? r.entity} {r.action}</td><td className="p-3 font-mono text-xs text-muted-foreground">{summary(r.meta)}</td></tr>)}</tbody>
        </table>
        {rows.length === 0 && <p className="p-10 text-center text-muted-foreground">No activity yet.</p>}
      </div>
    </AppShell>
  );
}
