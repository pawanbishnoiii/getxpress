import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export function fillTemplate(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

const SITE = "https://parcel-pilot-global.lovable.app";
const abs = (u?: string | null) => (u ? (u.startsWith("http") ? u : SITE + u) : null);
const DEFAULT_LOGO = "/__l5e/assets-v1/5a124554-0e96-4f24-9f12-d4dc3d38f3e5/getxpress-wordmark.png";

export function brandedHtml(body: string, company: string, logo?: string | null, image?: string | null, extra: { tracking?: string; cta?: { label: string; href: string } } = {}) {
  const paras = esc(body).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.65;font-size:15px">${p.replace(/\n/g, "<br>")}</p>`).join("");
  const btn = (l: string, h: string) => `<a href="${esc(h)}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:999px;font-size:15px">${esc(l)}</a>`;
  const trk = extra.tracking ? `<div style="margin:18px 0;padding:16px;border:1px dashed #cbd5e1;border-radius:12px;text-align:center"><div style="font-size:12px;color:#64748b;letter-spacing:1px">TRACKING NUMBER</div><div style="font-family:monospace;font-size:20px;font-weight:bold;margin:6px 0">${esc(extra.tracking)}</div><img src="https://bwipjs-api.metafloor.com/?bcid=code128&scale=2&height=12&text=${encodeURIComponent(extra.tracking)}" alt="Barcode ${esc(extra.tracking)}" style="max-width:100%;height:auto"></div>` : "";
  const cta = extra.cta ?? (extra.tracking ? { label: "Track your parcel", href: `${SITE}/track?id=${extra.tracking}` } : { label: "Open GetXpress", href: SITE });
  const social = [["Instagram", "https://instagram.com/getxpress"], ["Facebook", "https://facebook.com/getxpress"], ["X", "https://x.com/getxpress"], ["WhatsApp", "https://wa.me/"]].map(([n, h]) => `<a href="${h}" style="color:#f97316;text-decoration:none;margin:0 8px;font-weight:bold">${n}</a>`).join("");
  const banner = abs(image) ?? `${SITE}/__l5e/banner.jpg`;
  return `<div style="background:#ffffff;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#14213d"><div style="max-width:600px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden"><div style="padding:20px 24px;border-bottom:4px solid #f97316"><img src="${esc(abs(logo) ?? SITE + DEFAULT_LOGO)}" alt="${esc(company)}" height="38" style="display:block"></div>${image ? `<img src="${esc(banner)}" alt="" style="width:100%;display:block">` : `<div style="background:#14213d;color:#ffffff;padding:26px 24px;font-size:22px;font-weight:bold">Fast, safe parcels across India &amp; the world 🚚</div>`}<div style="padding:26px 24px">${paras}${trk}<div style="text-align:center;margin:22px 0 6px">${btn(cta.label, cta.href)}</div></div><div style="padding:18px 24px;background:#f8fafc;text-align:center;font-size:13px">${social}<p style="color:#64748b;margin:12px 0 0">${esc(company)} · getxpress.in</p></div></div></div>`;
}

/** Server-only: send one email through the admin-configured SMTP account. */
export async function sendSmtp(to: string, subject: string, body: string, opts: { templateKey?: string; image?: string | null; tracking?: string; cta?: { label: string; href: string } } = {}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: saved }, { data: app }] = await Promise.all([
    supabaseAdmin.from("smtp_settings").select("*").eq("id", true).maybeSingle(),
    supabaseAdmin.from("app_settings").select("company_name,logo_url").eq("id", true).maybeSingle(),
  ]);
  // No saved form yet (or blank host): use Gmail SSL defaults with the server-stored account.
  const smtp = saved?.host ? saved : { ...(saved ?? {}), host: "smtp.gmail.com", port: 465, secure: "ssl", username: saved?.username ?? null, enabled: saved?.username ? !!saved.enabled : true, from_name: saved?.from_name ?? "GetXpress", from_email: saved?.from_email ?? null };
  const company = app?.company_name ?? "GetXpress";
  const log = (status: string, error?: string) =>
    supabaseAdmin.from("email_logs").insert({ to_email: to, subject, template_key: opts.templateKey ?? null, status, error: error ?? null });
  const password = (process.env["SMTP_PASSWORD"] ?? "").replace(/\s+/g, "");
  const envUser = process.env["SMTP_USERNAME"];
  // Until an admin saves the SMTP form, fall back to the server-stored Gmail account.
  const username = smtp?.username || envUser;
  const enabled = smtp?.username ? smtp.enabled : !!envUser;
  if (!smtp || !enabled || !username || !password) {
    const missing = [!enabled && "sending is switched off", !username && "SMTP username", !password && "server secret SMTP_PASSWORD"].filter(Boolean).join(", ");
    const error = `SMTP is not ready: ${missing || "configuration is incomplete"}. Save the SMTP account in Admin → SMTP & email and add SMTP_PASSWORD to the deployed server secrets.`;
    await log("skipped", error);
    return { sent: false, error };
  }
  try {
    const from = { name: smtp.from_name ?? company, email: smtp.from_email || username };
    const html = brandedHtml(body, company, app?.logo_url, opts.image);
    let usedWorker = false; let via = "worker"; let messageId: string | undefined; let response: string | undefined;
    try {
      const { WorkerMailer } = await import("worker-mailer");
      const mailer = await WorkerMailer.connect({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure === "ssl",
        startTls: smtp.secure === "starttls",
        credentials: { username, password },
        authType: "plain",
      });
      usedWorker = true;
      const r: any = await mailer.send({ from, to, subject, text: body, html }); messageId = r?.messageId; response = r?.response;
      await mailer.close();
    } catch (e) {
      // Outside Cloudflare (preview/dev on Node) `cloudflare:sockets` is missing — use nodemailer instead.
      if (usedWorker || !/cloudflare:sockets|cloudflare:|Unsupported URL scheme|ERR_UNSUPPORTED_ESM_URL_SCHEME|Cannot find/i.test(String((e as Error)?.message ?? e))) throw e;
      const mod = "nodemailer";
      const nm = (await import(/* @vite-ignore */ mod)) as typeof import("nodemailer");
      const t = (nm.default ?? nm).createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure === "ssl", requireTLS: smtp.secure === "starttls", auth: { user: username, pass: password } });
      via = "node"; const info = await t.sendMail({ from: `"${from.name}" <${from.email}>`, to, subject, text: body, html }); messageId = info.messageId; response = info.response;
    }
    await log("sent");
    return { sent: true, via, messageId, response, host: smtp.host, port: smtp.port, from: from.email };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("SMTP send failed:", msg);
    await log("failed", msg.slice(0, 500));
    return { sent: false as const, error: msg, host: smtp.host, port: smtp.port };
  }
}

/** Server-only: render a stored template and send it. */
export async function sendTemplate(key: string, to: string, vars: Record<string, string>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: t }, { data: app }] = await Promise.all([
    supabaseAdmin.from("email_templates").select("*").eq("key", key).maybeSingle(),
    supabaseAdmin.from("app_settings").select("company_name").eq("id", true).single(),
  ]);
  if (!t || !t.enabled) return { sent: false, error: "Template disabled" };
  const all = { company: app?.company_name ?? "GetXpress", ...vars };
  return sendSmtp(to, fillTemplate(t.subject, all), fillTemplate(t.body, all), { templateKey: key, image: t.image_url });
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Admin access required");
}

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ to: z.string().email(), templateKey: z.string().max(60).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.templateKey)
      return sendTemplate(data.templateKey, data.to, { name: "Test customer", tracking: "GX000TEST", status: "In transit", link: "https://getxpress.in/track", offer: "Flat 20% off this week." });
    return sendSmtp(data.to, "GetXpress SMTP test", "Your SMTP settings are working.\n\nThis is a test email.");
  });

/** Admin sends an offer to one customer at a time (no bulk lists). */
export const sendOfferEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ to: z.string().email(), name: z.string().max(80), offer: z.string().min(3).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return sendTemplate("new_offer", data.to, { name: data.name, offer: data.offer });
  });

/** Admin: effective SMTP settings (fills in the server-stored account when the form was never saved). */
export const getSmtpStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin.from("smtp_settings").select("*").eq("id", true).single();
    const envUser = process.env["SMTP_USERNAME"] ?? "";
    return {
      provider: s?.provider ?? "gmail", host: s?.host ?? "smtp.gmail.com", port: s?.port ?? 465, secure: s?.secure ?? "ssl",
      username: s?.username || envUser, from_name: s?.from_name || "GetXpress", from_email: s?.from_email || s?.username || envUser,
      enabled: s?.username ? !!s.enabled : !!envUser, passwordSet: !!process.env["SMTP_PASSWORD"],
    };
  });

export const saveSmtpSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    provider: z.enum(["gmail", "hostinger", "custom"]), host: z.string().min(3).max(120), port: z.number().int().min(1).max(65535),
    secure: z.enum(["ssl", "starttls", "none"]), username: z.string().min(3).max(160), from_name: z.string().max(80),
    from_email: z.string().email().or(z.literal("")), enabled: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin.from("smtp_settings").upsert({ id: true, ...data, from_email: data.from_email || null, updated_at: new Date().toISOString() });
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });

/** Signed-in user: send the welcome email once (skips synthetic phone-login addresses). */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string }).email;
    if (!email || /@phone\.(?:getxpress\.in|bnoy\.app)$/i.test(email)) return { sent: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("email_logs").select("id", { count: "exact", head: true }).eq("to_email", email).eq("template_key", "welcome");
    if (count) return { sent: false };
    const { data: p } = await supabaseAdmin.from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
    const origin = new URL(process.env["PUBLIC_BASE_URL"] ?? "https://getxpress.in").origin;
    return sendTemplate("welcome", email, { name: (p as { full_name?: string } | null)?.full_name || email.split("@")[0]!, link: `${origin}/ship` });
  });
