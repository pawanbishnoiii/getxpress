import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Called every 4 hours by a scheduled job. Probes the database and stores the result.
export const Route = createFileRoute("/api/public/health-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const started = Date.now();
        const checks: Record<string, { ok: boolean; rows?: number | null; error?: string }> = {};
        let status = "healthy";
        for (const table of ["profiles", "shipments", "tracking_events", "point_applications"] as const) {
          const { count, error } = await supabaseAdmin.from(table).select("id", { count: "exact", head: true });
          checks[table] = error ? { ok: false, error: error.message } : { ok: true, rows: count };
          if (error) status = "degraded";
        }
        const latency = Date.now() - started;
        if (latency > 5000 && status === "healthy") status = "slow";
        await supabaseAdmin.from("health_checks").insert({ status, latency_ms: latency, details: checks });
        // Keep 90 days of history
        await supabaseAdmin.from("health_checks").delete().lt("checked_at", new Date(Date.now() - 90 * 864e5).toISOString());
        return Response.json({ status, latency_ms: latency });
      },
    },
  },
});
