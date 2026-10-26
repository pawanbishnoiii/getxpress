import { createFileRoute } from "@tanstack/react-router";

// TezSender delivery/incoming webhook. Admin pastes this URL with ?secret=<webhook secret> into TezSender.
export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: s } = await supabaseAdmin.from("whatsapp_settings").select("webhook_secret").eq("id", true).maybeSingle();
        const secret = new URL(request.url).searchParams.get("secret") ?? request.headers.get("x-webhook-secret");
        if (!s?.webhook_secret || secret !== s.webhook_secret) return new Response("Unauthorized", { status: 401 });
        const text = (await request.text()).slice(0, 20000);
        let payload: unknown = text;
        try { payload = JSON.parse(text); } catch { /* keep raw */ }
        const { error } = await supabaseAdmin.from("notifications").insert({ kind: "whatsapp_webhook", channel: "whatsapp", subject: "WhatsApp event", body: text.slice(0, 500), status: "received", meta: { payload } as never });
        if (error) return new Response("Storage error", { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
