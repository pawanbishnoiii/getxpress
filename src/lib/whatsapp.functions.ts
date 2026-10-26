import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-guard";

/** Public: is WhatsApp OTP switched on by the Admin? (drives the top banner) */
export const getWhatsappStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("whatsapp_ready");
  return { ready: Boolean(data) };
});

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Only Admin can do this");
}

export const getWhatsappAdmin = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase.from("whatsapp_settings").select("*").eq("id", true).maybeSingle();
    return { ...data, api_key: data?.api_key ? "••••" + data.api_key.slice(-4) : "", has_key: Boolean(data?.api_key) };
  });

export const saveWhatsappAdmin = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((d: unknown) => z.object({
    enabled: z.boolean(), api_key: z.string().max(300).optional(), base_url: z.string().url().max(300),
    instance_id: z.string().max(60).optional(), webhook_secret: z.string().max(120).optional(),
    otp_template: z.string().min(8).max(500).includes("{{code}}"), notify_bookings: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
    if (!data.api_key || data.api_key.startsWith("••••")) delete patch["api_key"];
    const { error } = await context.supabase.from("whatsapp_settings").update(patch as never).eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: send a test or broadcast message with optional image + link. */
export const sendWhatsappAdmin = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((d: unknown) => z.object({
    numbers: z.array(z.string().min(10).max(15)).min(1).max(50), message: z.string().min(1).max(1000),
    mediaUrl: z.string().url().optional(), linkUrl: z.string().url().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { sendWhatsapp } = await import("./whatsapp.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const results = await Promise.allSettled(data.numbers.map((n) => sendWhatsapp({ to: n, message: data.message, mediaUrl: data.mediaUrl ?? null, linkUrl: data.linkUrl ?? null }, { force: true })));
    const rows = results.map((r, i) => ({ kind: "whatsapp", channel: "whatsapp", subject: "WhatsApp message", body: data.message, recipient: data.numbers[i] ?? null, status: r.status === "fulfilled" && r.value ? "sent" : "failed", error: r.status === "rejected" ? String(r.reason).slice(0, 300) : null, sent_at: new Date().toISOString(), meta: { mediaUrl: data.mediaUrl ?? null, linkUrl: data.linkUrl ?? null } }));
    await supabaseAdmin.from("notifications").insert(rows as never);
    return { sent: rows.filter((r) => r.status === "sent").length, failed: rows.filter((r) => r.status === "failed").map((r) => `${r.recipient}: ${r.error}`) };
  });
