import { createFileRoute } from "@tanstack/react-router";

// Public, read-only: reports which server settings exist on this host (never their values).
export const Route = createFileRoute("/api/public/deploy-check")({
  server: {
    handlers: {
      GET: async () => {
        const names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PUBLISHABLE_KEY", "SMTP_USERNAME", "SMTP_PASSWORD", "SHIPGLOBAL_API_KEY"];
        const env = Object.fromEntries(names.map((n) => [n, !!process.env[n]]));
        let database = "skipped";
        if (env["SUPABASE_URL"] && env["SUPABASE_SERVICE_ROLE_KEY"]) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { error } = await supabaseAdmin.from("app_settings").select("id", { head: true, count: "exact" });
            database = error ? "error" : "ok";
          } catch { database = "error"; }
        }
        const email = env["SMTP_USERNAME"] && env["SMTP_PASSWORD"] ? "configured" : "missing";
        const ok = Object.values(env).every(Boolean) && database === "ok";
        return Response.json({ ok, env, database, email }, { status: ok ? 200 : 503 });
      },
    },
  },
});
