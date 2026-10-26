import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { sendWhatsappAdmin } from "@/lib/whatsapp.functions";
import { testIntlApi } from "@/lib/intl-rates.functions";
import { IntlMarkupControl } from "@/components/site/IntlMarkupControl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, CheckCircle2, CircleOff } from "lucide-react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/admin/gateways/$category")({
  head: () => ({ meta: [
    { title: "Gateways & integrations — Get Xpress Admin" },
    { name: "description", content: "Manage payment, OTP, WhatsApp and courier partner APIs and webhooks." },
    { property: "og:title", content: "Get Xpress gateways" },
    { property: "og:description", content: "Payment, OTP, WhatsApp and delivery partner integrations." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Gateways,
});

type Field = { k: string; label: string; secret?: boolean; optional?: boolean; placeholder?: string };
type Prov = { id: string; name: string; category: "payment" | "otp" | "whatsapp" | "courier"; fields: Field[]; note?: string };
const P: Prov[] = [
  { id: "razorpay", name: "Razorpay", category: "payment", fields: [{ k: "key_id", label: "Key ID", placeholder: "rzp_live_…" }, { k: "key_secret", label: "Key secret", secret: true }, { k: "webhook_secret", label: "Webhook secret", secret: true }] },
  { id: "cashfree", name: "Cashfree", category: "payment", fields: [{ k: "app_id", label: "App ID" }, { k: "secret_key", label: "Secret key", secret: true }, { k: "webhook_secret", label: "Webhook secret", secret: true }] },
  { id: "paytm", name: "Paytm", category: "payment", fields: [{ k: "mid", label: "Merchant ID (MID)" }, { k: "merchant_key", label: "Merchant key", secret: true }, { k: "website", label: "Website name", placeholder: "DEFAULT" }] },
  { id: "msg91", name: "MSG91", category: "otp", fields: [{ k: "auth_key", label: "Auth key", secret: true }, { k: "sender_id", label: "Sender ID", placeholder: "GTXPRS" }, { k: "template_id", label: "DLT / Flow template ID" }] },
  { id: "fast2sms", name: "Fast2SMS", category: "otp", fields: [{ k: "api_key", label: "API key", secret: true }, { k: "sender_id", label: "Sender ID" }, { k: "template_id", label: "DLT template ID" }] },
  { id: "tezsender", name: "TezSender", category: "whatsapp", note: "When 'Use for OTP' is on, SMS OTP is switched off and all OTPs go on WhatsApp.", fields: [{ k: "base_url", label: "API base URL", placeholder: "https://…" }, { k: "api_key", label: "API key", secret: true }, { k: "instance_id", label: "Instance / sender ID" }, { k: "webhook_secret", label: "Webhook secret", secret: true }] },
  { id: "delhivery", name: "Delhivery", category: "courier", fields: [{ k: "api_token", label: "API token", secret: true }, { k: "pickup_location", label: "Pickup location name" }, { k: "client_name", label: "Client name" }] },
  { id: "ekart", name: "Ekart", category: "courier", fields: [{ k: "client_id", label: "Client ID" }, { k: "api_key", label: "API key", secret: true }, { k: "merchant_code", label: "Merchant code" }] },
  { id: "shiprocket", name: "Shiprocket", category: "courier", fields: [{ k: "email", label: "API user email" }, { k: "password", label: "API user password", secret: true }, { k: "pickup_location", label: "Pickup location" }] },
  { id: "shadowfax", name: "Shadowfax", category: "courier", fields: [{ k: "api_token", label: "API token", secret: true }, { k: "client_code", label: "Client code" }, { k: "warehouse_id", label: "Warehouse ID" }] },
  { id: "shipglobal", name: "International live rates", category: "courier", note: "Powers international prices. Customers only see the final GetXpress price. Rename services one per line, e.g. FedEx=GetXpress Priority Air", fields: [{ k: "base_url", label: "Host URL", placeholder: "https://shipglobal-rate-spark.lovable.app" }, { k: "api_key", label: "API key (stored securely on the server — paste only to replace)", secret: true, optional: true, placeholder: "sgk_…" }, { k: "webhook_secret", label: "Webhook secret (optional)", secret: true, optional: true }, { k: "service_names", label: "Customer service names (Original=New)", placeholder: "FedEx=GetXpress Priority Air" }] },
];
const TABS = [["payment", "Payment"], ["sms", "SMS OTP"], ["whatsapp", "WhatsApp"], ["deliverypartners", "Delivery partners"]] as const;
const SLUG: Record<string, Prov["category"]> = { payment: "payment", sms: "otp", whatsapp: "whatsapp", deliverypartners: "courier" };
const EXCLUSIVE = new Set(["payment", "otp"]);
const AUTOMATIONS = [["notify_booking", "Booking confirmation"], ["notify_pickup", "Picked up"], ["notify_transit", "In transit / out for delivery"], ["notify_delivered", "Delivered"], ["send_label_image", "Send label image"], ["send_tracking_link", "Send tracking link"]] as const;
const field = "mt-1 h-11 w-full rounded-md border bg-background px-3 text-sm";

function Gateways() {
  const { isAdmin } = useRoles();
  const qc = useQueryClient();
  const { category } = Route.useParams();
  const tab = SLUG[category] ?? "payment";
  const { data } = useQuery({ queryKey: ["gateways"], enabled: isAdmin, queryFn: async () => { const r = await supabase.from("gateway_configs").select("*"); if (r.error) throw r.error; return r.data; } });
  const { data: channel } = useQuery({ queryKey: ["otp-channel", data], queryFn: async () => (await supabase.rpc("otp_channel")).data as string });
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const save = async (p: Prov, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const prev = (data?.find(r => r.provider === p.id)?.config ?? {}) as Record<string, unknown>;
    const config: Record<string, unknown> = { ...prev };
    for (const x of p.fields) { const v = String(f.get(x.k) ?? "").trim(); if (v) config[x.k] = v; else if (!x.secret) delete config[x.k]; }
    if (p.id === "tezsender") { config["use_for_otp"] = f.get("use_for_otp") === "on"; for (const [k] of AUTOMATIONS) config[k] = f.get(k) === "on"; }
    const enabled = f.get("enabled") === "on";
    if (enabled && p.fields.some(x => x.secret && !x.optional && !config[x.k] && x.k !== "webhook_secret")) { toast.error("Add the required keys before turning this on."); return; }
    const { data: u } = await supabase.auth.getUser();
    const r = await supabase.from("gateway_configs").upsert({ provider: p.id, category: p.category, enabled, live_mode: f.get("live_mode") === "on", config: config as never, updated_at: new Date().toISOString(), updated_by: u.user?.id ?? null });
    if (!r.error && p.id === "tezsender") {
      const wa: Record<string, unknown> = { enabled, base_url: String(config["base_url"] ?? ""), instance_id: (config["instance_id"] as string) ?? null, notify_bookings: config["notify_booking"] !== false, updated_at: new Date().toISOString() };
      if (config["api_key"]) wa["api_key"] = config["api_key"];
      if (config["webhook_secret"]) wa["webhook_secret"] = config["webhook_secret"];
      await supabase.from("whatsapp_settings").update(wa as never).eq("id", true);
    }
    if (r.error) toast.error(r.error.message); else { toast.success(enabled && EXCLUSIVE.has(p.category) ? `${p.name} is now the only active ${p.category === "otp" ? "SMS" : "payment"} gateway` : `${p.name} saved`); qc.invalidateQueries({ queryKey: ["gateways"] }); }
  };
  return (
    <AppShell wide>
      <PageHeader title="Gateways & integrations" sub={`OTP is currently sent by: ${channel === "whatsapp" ? "WhatsApp (TezSender)" : channel === "sms" ? "SMS" : "on-screen test code"}`} />
      {!isAdmin ? <p>Admin access required.</p> : <>
        <div className="mb-5 flex flex-wrap gap-1 border-b pb-3">{TABS.map(([k, l]) => <Button key={k} asChild variant={category === k ? "default" : "ghost"}><Link to="/admin/gateways/$category" params={{ category: k }}>{l}</Link></Button>)}</div>
        {EXCLUSIVE.has(tab) && <p className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">Only one {tab === "otp" ? "SMS" : "payment"} gateway works at a time — turning one on switches the others off automatically.</p>}
        <div className="grid gap-5 lg:grid-cols-2">
          {P.filter(p => p.category === tab).map(p => {
            const row = data?.find(r => r.provider === p.id);
            const cfg = (row?.config ?? {}) as Record<string, unknown>;
            const hook = `${origin}/api/public/${p.category === "whatsapp" ? "whatsapp" : p.id}/webhook`;
            return (
              <form key={p.id + (row?.updated_at ?? "")} onSubmit={e => save(p, e)} className="space-y-3 rounded-lg border bg-card p-5">
                <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{p.name}</h2>
                  <span className={`flex items-center gap-1 text-xs font-semibold ${row?.enabled ? "text-primary" : "text-muted-foreground"}`}>{row?.enabled ? <CheckCircle2 className="h-4 w-4" /> : <CircleOff className="h-4 w-4" />}{row?.enabled ? "On" : "Off"}</span></div>
                {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                {p.fields.map(x => <label key={x.k} className="block text-sm">{x.label}
                  {x.k === "service_names" ? <textarea name={x.k} rows={4} defaultValue={String(cfg[x.k] ?? "")} placeholder={x.placeholder} className="mt-1 w-full rounded-md border bg-background p-3 text-sm" /> : <input name={x.k} type={x.secret ? "password" : "text"} autoComplete="off" defaultValue={x.secret ? "" : String(cfg[x.k] ?? "")} placeholder={x.secret && cfg[x.k] ? "•••••• saved — leave blank to keep" : x.placeholder} className={field} />}</label>)}
                <label className="block text-sm">Webhook URL (paste in {p.name})
                  <div className="mt-1 flex gap-2"><input readOnly value={hook} className={`${field} mt-0 font-mono text-xs`} /><Button type="button" variant="outline" size="icon" aria-label="Copy webhook" onClick={() => { navigator.clipboard.writeText(hook); toast.success("Copied"); }}><Copy /></Button></div></label>
                {p.id === "tezsender" && <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" name="use_for_otp" defaultChecked={!!cfg["use_for_otp"]} />Use for OTP (turns SMS OTP off)</label>
                  {AUTOMATIONS.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name={k} defaultChecked={cfg[k] !== false} />{l}</label>)}
                </div>}
                <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="enabled" defaultChecked={row?.enabled} />Enabled</label>
                  {p.category !== "whatsapp" && <label className="flex items-center gap-2"><input type="checkbox" name="live_mode" defaultChecked={row?.live_mode} />Live mode</label>}</div>
                <div className="flex flex-wrap gap-2"><Button type="submit">Save {p.name}</Button>{p.id === "shipglobal" && <IntlTestButton />}</div>
              </form>);
          })}
        </div>
        {tab === "courier" && <div className="mt-5 max-w-xl"><IntlMarkupControl /></div>}
        {tab === "whatsapp" && <WhatsappTools />}
        <p className="mt-6 text-xs text-muted-foreground">Keys are visible only to admins and never shown again after saving. Live sending for each partner starts once its API is verified with your account.</p>
      </>}
    </AppShell>
  );
}

function IntlTestButton() {
  const test = useServerFn(testIntlApi);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  return <>
    <Button type="button" variant="outline" disabled={busy} onClick={async () => {
      setBusy(true); setOut(null);
      try { const r = await test(); setOut(r.ok ? `Connected in ${r.ms} ms${r.enabled ? "" : " (service is off — tick Enabled and save)"} · ${r.count} services: ${r.names.join(", ")}` : `Failed (${r.ms} ms): ${r.error}`); }
      catch (e) { setOut((e as Error).message); } finally { setBusy(false); }
    }}>{busy ? "Testing…" : "Test connection & speed"}</Button>
    {out && <p className="w-full rounded-md border bg-muted/40 p-2 text-xs">{out}</p>}
  </>;
}

const VARS = { name: "Test customer", tracking: "GX000TEST", status: "in transit", link: "https://getxpress.in/track", otp: "482913", offer: "Flat 20% off this week." } as Record<string, string>;
const fill = (t: string) => t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => VARS[k] ?? "");

function WhatsappTools() {
  const qc = useQueryClient();
  const send = useServerFn(sendWhatsappAdmin);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { data = [] } = useQuery({ queryKey: ["wa-templates"], queryFn: async () => (await supabase.from("whatsapp_templates").select("*").order("key")).data ?? [] });
  const test = async (message: string, mediaUrl?: string | null, linkUrl?: string | null, id = "plain") => {
    if (!/^\d{10}$/.test(to.replace(/\D/g, "").slice(-10))) { toast.error("Enter a 10-digit WhatsApp number first"); return; }
    setBusy(id);
    try {
      const r = await send({ data: { numbers: [to], message, ...(mediaUrl ? { mediaUrl } : {}), ...(linkUrl ? { linkUrl } : {}) } });
      r.sent ? toast.success("Test message sent") : toast.error(`Not sent: ${r.failed[0] ?? "WhatsApp key not saved"}`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-5">
        <label className="min-w-60 flex-1 text-sm font-semibold">Test WhatsApp number<input value={to} onChange={(e) => setTo(e.target.value)} placeholder="98XXXXXXXX" inputMode="tel" className={field} /></label>
        <Button disabled={!!busy} onClick={() => test("GetXpress WhatsApp test ✅ Your gateway is connected.")}>Send plain test</Button>
      </div>
      <h2 className="text-lg font-bold">Message templates</h2>
      <p className="text-xs text-muted-foreground">Placeholders: {"{{name}} {{tracking}} {{status}} {{link}} {{otp}} {{offer}}"}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.map((t) => (
          <form key={t.key + t.updated_at} className="space-y-2 rounded-lg border bg-card p-4" onSubmit={async (e) => {
            e.preventDefault(); const f = new FormData(e.currentTarget);
            const r = await supabase.from("whatsapp_templates").update({ name: String(f.get("name")), body: String(f.get("body")), media_url: String(f.get("media_url")).trim() || null, link_url: String(f.get("link_url")).trim() || null, enabled: f.get("enabled") === "on", updated_at: new Date().toISOString() }).eq("key", t.key);
            r.error ? toast.error(r.error.message) : (toast.success("Template saved"), qc.invalidateQueries({ queryKey: ["wa-templates"] }));
          }}>
            <div className="flex items-center justify-between"><input name="name" defaultValue={t.name} className="bg-transparent font-bold outline-none" /><span className="rounded bg-secondary px-2 py-0.5 text-xs">{t.event}</span></div>
            <textarea name="body" defaultValue={t.body} rows={3} className="w-full rounded-md border bg-background p-2 text-sm" />
            <div className="grid gap-2 sm:grid-cols-2"><input name="media_url" defaultValue={t.media_url ?? ""} placeholder="Image URL (optional)" className={field + " mt-0"} /><input name="link_url" defaultValue={t.link_url ?? ""} placeholder="Button / link URL (optional)" className={field + " mt-0"} /></div>
            <p className="rounded-md bg-secondary/60 p-2 text-xs">Preview: {fill(t.body)}</p>
            <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={t.enabled} />Active</label>
              <Button type="submit" size="sm">Save</Button>
              <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => test(fill(t.body), t.media_url, t.link_url, t.key)}>{busy === t.key ? "Sending…" : "Send test"}</Button></div>
          </form>))}
      </div>
    </section>
  );
}
