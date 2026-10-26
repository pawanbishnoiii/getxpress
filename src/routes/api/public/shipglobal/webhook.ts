import { createFileRoute } from "@tanstack/react-router";

/**
 * Optional international-rates webhook. If an admin saved a webhook secret, callers must send it in
 * `x-webhook-secret`; otherwise the hook only acknowledges. It never writes data or returns private info.
 */
export const Route = createFileRoute("/api/public/shipglobal/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("gateway_configs").select("config").eq("provider", "shipglobal").maybeSingle();
        const secret = String(((data?.config ?? {}) as Record<string, unknown>)["webhook_secret"] ?? "");
        if (secret) {
          const got = request.headers.get("x-webhook-secret") ?? "";
          let diff = got.length ^ secret.length;
          for (let i = 0; i < Math.min(got.length, secret.length); i++) diff |= got.charCodeAt(i) ^ secret.charCodeAt(i);
          if (diff !== 0) return new Response("Invalid secret", { status: 401 });
        }
        const body = (await request.text()).slice(0, 5000);
        await supabaseAdmin.from("audit_logs").insert({ action: "intl_rates_webhook", entity: "gateway", entity_id: "shipglobal", meta: { size: body.length } });
        return Response.json({ ok: true });
      },
    },
  },
});
