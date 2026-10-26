import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Mail } from "lucide-react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Get Xpress" }, { name: "description", content: "Shipment updates and application notifications." }, { property: "og:title", content: "Notifications — Get Xpress" }, { property: "og:description", content: "Shipment updates and application notifications." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Notifications,
});

function Notifications() {
  const { isAdmin } = useRoles();
  const { data = [] } = useQuery({ queryKey: ["notifications"], queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [] });
  return (
    <AppShell>
      <PageHeader title="Notifications" sub="Every shipment update and partner application creates a notification here." />
      <p className="mb-4 flex items-start gap-2 rounded-2xl bg-muted p-3 text-sm"><Mail className="mt-0.5 h-4 w-4 shrink-0" /> Email delivery is queued, not sent yet: an email sender domain must be set up first. {isAdmin && "Admins see all queued emails."}</p>
      <div className="space-y-2">
        {data.map((n) => (
          <div key={n.id} className="rounded-2xl border bg-card p-4">
            <div className="flex justify-between gap-3"><p className="font-bold">{n.subject}</p><span className="shrink-0 rounded-full bg-cream px-2.5 py-0.5 text-xs font-bold">{n.status}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("en-IN")} · to {n.recipient ?? "—"}</p>
          </div>
        ))}
        {data.length === 0 && <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground"><Bell className="mx-auto h-8 w-8" /><p className="mt-2">No notifications yet.</p></div>}
      </div>
    </AppShell>
  );
}
