import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Store } from "lucide-react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({ meta: [{ title: "Point applications — Get Xpress Admin" }, { name: "description", content: "Review Get Xpress Point partner applications." }, { property: "og:title", content: "Point applications — Get Xpress" }, { property: "og:description", content: "Review Get Xpress Point partner applications." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Applications,
});

function Applications() {
  const { isAdmin: admin, roles } = useRoles();
  const isAdmin = admin || roles.some((r) => r === "state_manager" || r === "state_director");
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["applications"], queryFn: async () => (await supabase.from("point_applications").select("*").order("created_at", { ascending: false })).data ?? [] });
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("point_applications").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Marked ${status}`); qc.invalidateQueries({ queryKey: ["applications"] }); }
  };
  return (
    <AppShell wide>
      <PageHeader title="Hub applications" sub={isAdmin ? `${data.length} applications` : "Your applications"} />
      <div className="grid gap-3 lg:grid-cols-2">
        {data.map((a) => (
          <div key={a.id} className="rounded-3xl border bg-card p-5">
            <div className="flex justify-between"><p className="font-display text-xl font-extrabold">{a.business_name}</p><span className="rounded-full bg-cream px-3 py-1 text-xs font-bold capitalize">{a.status}</span></div>
            <p className="text-sm text-muted-foreground">{a.reference} · {a.business_type} · {new Date(a.created_at).toLocaleDateString("en-IN")}</p>
            <p className="mt-2 text-sm">{a.full_name} · {a.phone} · {a.email}</p>
            <p className="text-sm text-muted-foreground">{a.address}, {a.city}, {a.state} {a.pincode}</p>
            <p className="mt-1 text-xs text-muted-foreground">Space {a.space_sqft ?? "—"} sqft · capacity {a.daily_capacity ?? "—"}/day · applicant user ID <span className="font-mono">{a.user_id}</span></p>
            {isAdmin && a.status === "submitted" && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => setStatus(a.id, "approved")} className="flex-1 rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground">Approve</button>
                <button onClick={() => setStatus(a.id, "rejected")} className="flex-1 rounded-xl border py-2 text-sm font-bold">Reject</button>
              </div>
            )}
            {isAdmin && a.status === "approved" && <p className="mt-3 rounded-xl bg-muted p-2 text-xs">Next: grant this applicant the Hub role from <b>Pincodes & staff → Staff</b> (by phone), then an Area Manager allocates pincodes.</p>}
          </div>
        ))}
        {data.length === 0 && <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground lg:col-span-2"><Store className="mx-auto h-8 w-8" /><p className="mt-2">No applications yet.</p></div>}
      </div>
    </AppShell>
  );
}
