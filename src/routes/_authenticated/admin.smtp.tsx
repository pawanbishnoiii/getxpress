import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";
import { getSmtpStatus, saveSmtpSettings, sendOfferEmail, sendTestEmail } from "@/lib/email.functions";

export const Route = createFileRoute("/_authenticated/admin/smtp")({
  head: () => ({ meta: [
    { title: "SMTP Company, email & templates — GetXpress Admin email templates — GetXpress Admin" },
    { name: "description", content: "Manage company profile, website status, SMTP email and email templates." },
    { property: "og:title", content: "GetXpress company settings" },
    { property: "og:description", content: "Company info, SMTP and email automations." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Company,
});

const field = "mt-1 h-11 w-full rounded-md border bg-background px-3 text-sm";
const PRESETS = { gmail: { host: "smtp.gmail.com", port: 465, secure: "ssl" }, hostinger: { host: "smtp.hostinger.com", port: 465, secure: "ssl" }, custom: { host: "", port: 587, secure: "starttls" } } as const;
const TABS = [["smtp", "SMTP email"], ["templates", "Email templates"], ["offers", "Send offer"], ["logs", "Email log"]] as const;

async function uploadImage(file: File) {
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.]/g, "")}`;
  const r = await supabase.storage.from("brand-assets").upload(path, file, { contentType: file.type });
  if (r.error) throw r.error;
  const signed = await supabase.storage.from("brand-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

function Company() {
  const { isAdmin } = useRoles();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("smtp");
  if (!isAdmin) return <AppShell><p>Admin access required.</p></AppShell>;
  return (
    <AppShell wide>
      <PageHeader title="SMTP & email" sub="Mail server, templates, offers and delivery log" />
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border bg-card p-1">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${tab === k ? "bg-ink text-ink-foreground" : "text-muted-foreground"}`}>{l}</button>)}
      </div>
      
      {tab === "smtp" && <SmtpForm />}
      {tab === "templates" && <Templates />}
      {tab === "offers" && <Offers />}
      {tab === "logs" && <Logs />}
    </AppShell>
  );
}

function SmtpForm() {
  const qc = useQueryClient();
  const test = useServerFn(sendTestEmail);
  const status = useServerFn(getSmtpStatus);
  const saveFn = useServerFn(saveSmtpSettings);
  const { data: s } = useQuery({ queryKey: ["smtp"], queryFn: () => status() });
  const [provider, setProvider] = useState<keyof typeof PRESETS | null>(null);
  const [to, setTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; at: string; ms: number; detail?: string } | null>(null);
  if (!s) return null;
  const p = provider ?? (s.provider as keyof typeof PRESETS);
  const preset = provider ? PRESETS[provider] : s;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form key={p} className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try { await saveFn({ data: { provider: p, host: String(f.get("host")).trim(), port: Number(f.get("port")), secure: String(f.get("secure")) as "ssl", username: String(f.get("username")).trim(), from_name: String(f.get("from_name")), from_email: String(f.get("from_email")).trim(), enabled: f.get("enabled") === "on" } }); toast.success("SMTP saved"); qc.invalidateQueries({ queryKey: ["smtp"] }); } catch (err) { toast.error((err as Error).message); }
      }}>
        <div className="flex gap-2 md:col-span-2">{(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => <button type="button" key={k} onClick={() => setProvider(k)} className={`rounded-lg border px-4 py-2 text-sm font-semibold capitalize ${p === k ? "border-primary bg-primary/10 text-primary" : ""}`}>{k}</button>)}</div>
        <label className="text-sm font-semibold">SMTP host<input name="host" required defaultValue={preset.host} className={field} /></label>
        <label className="text-sm font-semibold">Port<input name="port" type="number" required defaultValue={preset.port} className={field} /></label>
        <label className="text-sm font-semibold">Security<select name="secure" defaultValue={preset.secure} className={field}><option value="ssl">SSL (465)</option><option value="starttls">STARTTLS (587)</option><option value="none">None</option></select></label>
        <label className="text-sm font-semibold">Username / email<input name="username" required defaultValue={s.username ?? ""} className={field} /></label>
        <label className="text-sm font-semibold">From name<input name="from_name" defaultValue={s.from_name ?? "GetXpress"} className={field} /></label>
        <label className="text-sm font-semibold">From email (company email)<input name="from_email" defaultValue={s.from_email ?? ""} className={field} /></label>
        <p className="rounded-lg bg-secondary p-3 text-xs md:col-span-2"><b>{s.passwordSet ? "Password saved on server ✓" : "Password missing"}</b> — the password is stored securely on the server, not in this form. For Gmail use a 16-letter App Password; spaces are removed automatically.</p>
        <label className="flex items-center gap-2 text-sm md:col-span-2"><input name="enabled" type="checkbox" defaultChecked={s.enabled} className="h-5 w-5" />Send emails through this account</label>
        <Button type="submit" className="md:w-fit">Save SMTP</Button>
      </form>
      <div className="h-fit rounded-xl border bg-card p-5">
        <h3 className="font-bold">Send a test email</h3>
        <p className="mt-1 text-xs text-muted-foreground">Uses the saved SMTP account. {s.enabled ? "Sending is on." : "Sending is off — turn it on and save first."}</p>
        <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" className={field} />
        <Button className="mt-3 w-full" disabled={testing || !/^\S+@\S+\.\S+$/.test(to)} onClick={async () => {
          setTesting(true); setResult(null);
          const started = Date.now();
          const r = await test({ data: { to } }).catch((e) => ({ sent: false, error: (e as Error).message }));
          setTesting(false);
          const x = r as { sent?: boolean; error?: string; host?: string; port?: number; messageId?: string; response?: string; via?: string };
          setResult({ ok: !!x.sent, msg: x.sent ? `Accepted by ${x.host}:${x.port} for ${to}. Check the inbox (and spam folder).` : String(x.error ?? "Unknown error"), at: new Date().toLocaleTimeString("en-IN"), ms: Date.now() - started, detail: [x.response && `Server reply: ${x.response}`, x.messageId && `Message ID: ${x.messageId}`, x.via && `Sender: ${x.via === "worker" ? "published site" : "preview fallback"}`].filter(Boolean).join(" · ") });
          qc.invalidateQueries({ queryKey: ["email-logs"] });
        }}>{testing ? "Sending…" : "Send test"}</Button>
        {result && (
          <div role="status" className={`mt-4 rounded-lg border p-3 text-sm ${result.ok ? "border-primary/40 bg-primary/10" : "border-destructive/40 bg-destructive/10"}`}>
            <p className="font-bold">{result.ok ? "✓ Sent successfully" : "✕ Not sent"}</p>
            <p className="mt-1 break-words text-xs">{result.msg}</p>
            {result.detail && <p className="mt-1 break-words text-[11px] text-muted-foreground">{result.detail}</p>}
            <p className="mt-1 text-[11px] text-muted-foreground">{result.at} · {result.ms} ms</p>
            {!result.ok && /timed? ?out|ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(result.msg) && <p className="mt-2 text-[11px]">Could not reach the mail server. Check host, port and security (Gmail: 465 SSL, Hostinger: smtp.hostinger.com 465 SSL).</p>}
            {!result.ok && /SMTP is not ready|credentials missing|SMTP_PASSWORD/i.test(result.msg) && <p className="mt-2 text-[11px]">Complete both parts: save the SMTP username here, then set <b>SMTP_PASSWORD</b> as a server secret. Do not paste an app password into this page.</p>}
            {!result.ok && /cloudflare:sockets|sockets/i.test(result.msg) && <p className="mt-2 text-[11px]">Email sending works on the published site; publish and test again there.</p>}
            {!result.ok && /auth|535|credentials|password/i.test(result.msg) && <p className="mt-2 text-[11px]">The username or app password was rejected. For Gmail, create a new App Password.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Templates() {
  const qc = useQueryClient();
  const test = useServerFn(sendTestEmail);
  const { data = [] } = useQuery({ queryKey: ["email-templates"], queryFn: async () => (await supabase.from("email_templates").select("*").order("key")).data ?? [] });
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">Placeholders: {"{{name}} {{tracking}} {{status}} {{link}} {{company}} {{offer}}"}</p>
      {data.map((t) => (
        <form key={t.key + t.updated_at} className="grid gap-3 rounded-xl border bg-card p-5" onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          let image_url = t.image_url;
          const file = f.get("image") as File | null;
          if (file && file.size) { try { image_url = await uploadImage(file); } catch (err) { toast.error((err as Error).message); return; } }
          const r = await supabase.from("email_templates").update({ subject: String(f.get("subject")), body: String(f.get("body")), enabled: f.get("enabled") === "on", image_url, updated_at: new Date().toISOString() }).eq("key", t.key);
          if (r.error) toast.error(r.error.message); else { toast.success("Template saved"); qc.invalidateQueries({ queryKey: ["email-templates"] }); }
        }}>
          <div className="flex items-center justify-between"><h3 className="font-bold">{t.name} <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-normal">{t.kind}</span></h3><label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked={t.enabled} />Active</label></div>
          <input name="subject" defaultValue={t.subject} className={field} aria-label="Subject" />
          <textarea name="body" defaultValue={t.body} rows={5} className="w-full rounded-md border bg-background p-3 text-sm" aria-label="Body" />
          <div className="flex flex-wrap items-center gap-3">{t.image_url && <img src={t.image_url} alt="" className="h-14 rounded border" />}<input name="image" type="file" accept="image/*" className="text-sm" /></div>
          <div className="flex gap-2"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={async () => { const to = prompt("Send a test to which email?"); if (!to) return; const r = await test({ data: { to, templateKey: t.key } }).catch((e) => ({ sent: false, error: (e as Error).message })); r.sent ? toast.success("Sent") : toast.error(`Not sent: ${r.error}`); }}>Send test</Button></div>
        </form>
      ))}
    </div>
  );
}

function Offers() {
  const send = useServerFn(sendOfferEmail);
  const [busy, setBusy] = useState(false);
  return (
    <form className="grid max-w-xl gap-3 rounded-xl border bg-card p-5" onSubmit={async (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      setBusy(true);
      const r = await send({ data: { to: String(f.get("to")), name: String(f.get("name")), offer: String(f.get("offer")) } }).catch((err) => ({ sent: false, error: (err as Error).message }));
      setBusy(false);
      r.sent ? toast.success("Offer sent") : toast.error(`Not sent: ${r.error}`);
    }}>
      <p className="text-sm text-muted-foreground">Sends the "New offer" template (with its image) to one customer.</p>
      <input name="name" required placeholder="Customer name" className={field} />
      <input name="to" type="email" required placeholder="customer@email.com" className={field} />
      <textarea name="offer" required rows={4} placeholder="Flat 20% off on express parcels this week with code FAST20" className="w-full rounded-md border bg-background p-3 text-sm" />
      <Button disabled={busy} type="submit" className="w-fit">Send offer</Button>
    </form>
  );
}

function Logs() {
  const { data = [] } = useQuery({ queryKey: ["email-logs"], queryFn: async () => (await supabase.from("email_logs").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [] });
  return (
    <div className="overflow-x-auto rounded-lg border bg-card"><table className="enterprise-table"><thead><tr>{["When", "To", "Subject", "Status"].map((x) => <th key={x}>{x}</th>)}</tr></thead><tbody>
      {data.map((l) => <tr key={l.id}><td>{new Date(l.created_at).toLocaleString()}</td><td>{l.to_email}</td><td>{l.subject}</td><td><b className={l.status === "sent" ? "text-primary" : "text-destructive"}>{l.status}</b>{l.error && <p className="max-w-xs truncate text-xs text-muted-foreground">{l.error}</p>}</td></tr>)}
    </tbody></table></div>
  );
}
