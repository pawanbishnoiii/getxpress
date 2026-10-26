import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ProviderReadiness } from "./ProviderReadiness";

const SMTP: Record<string, { host: string; port: number }> = { gmail: { host: "smtp.gmail.com", port: 587 }, hostinger: { host: "smtp.hostinger.com", port: 465 }, custom: { host: "", port: 587 } };
const field = "mt-1 h-11 w-full rounded-md border bg-background px-3";

/** Admin-only integration settings. Passwords and secret keys are never stored here. */
export function Integrations() {
  const qc = useQueryClient();
  const { data: s } = useQuery({ queryKey: ["integrations"], queryFn: async () => (await supabase.from("integration_settings").select("*").eq("id", true).maybeSingle()).data });
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim() || null;
    const email = str("admin_alert_email");
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.error("Enter a valid alert email."); return; }
    const r = await supabase.from("integration_settings").update({
      admin_alert_email: email, smtp_provider: str("smtp_provider") ?? "gmail", smtp_host: str("smtp_host"), smtp_port: Number(f.get("smtp_port")) || null, smtp_user: str("smtp_user"), smtp_from: str("smtp_from"),
      payment_provider: str("payment_provider") ?? "none", payment_key_id: str("payment_key_id"), payment_live: f.get("payment_live") === "on",
      otp_provider: str("otp_provider") ?? "screen", otp_sender_id: str("otp_sender_id"),
      whatsapp_number: str("whatsapp_number"), whatsapp_enabled: f.get("whatsapp_enabled") === "on",
      webhook_url: str("webhook_url"), api_enabled: f.get("api_enabled") === "on",
      alert_on_booking: f.get("alert_on_booking") === "on", alert_on_application: f.get("alert_on_application") === "on", updated_at: new Date().toISOString(),
    }).eq("id", true);
    if (r.error) toast.error(r.error.message); else { toast.success("Integration settings saved"); qc.invalidateQueries({ queryKey: ["integrations"] }); }
  };
  const L = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block text-sm">{label}{children}</label>;
  return (
    <><ProviderReadiness />{s && <form key={s.updated_at} onSubmit={save} className="mt-8 space-y-6 border-t pt-6">
      <h2 className="text-2xl font-bold">Integrations</h2>
      <section className="grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-2">
        <h3 className="font-bold md:col-span-2">Email alerts (Gmail / Hostinger)</h3>
        <L label="Admin alert email"><input name="admin_alert_email" type="email" defaultValue={s.admin_alert_email ?? ""} placeholder="ops@getxpress.in" className={field} /></L>
        <L label="Provider"><select name="smtp_provider" defaultValue={s.smtp_provider} className={field} onChange={(e) => { const p = SMTP[e.target.value] ?? { host: "", port: 587 }; const form = e.target.form; if (!form) return; (form.elements.namedItem("smtp_host") as HTMLInputElement).value = p.host; (form.elements.namedItem("smtp_port") as HTMLInputElement).value = String(p.port); }}><option value="gmail">Gmail</option><option value="hostinger">Hostinger</option><option value="custom">Other</option></select></L>
        <L label="SMTP host"><input name="smtp_host" defaultValue={s.smtp_host ?? SMTP[s.smtp_provider]?.host} className={field} /></L>
        <L label="Port"><input name="smtp_port" type="number" defaultValue={s.smtp_port ?? SMTP[s.smtp_provider]?.port} className={field} /></L>
        <L label="Login email"><input name="smtp_user" defaultValue={s.smtp_user ?? ""} className={field} /></L>
        <L label="From name / address"><input name="smtp_from" defaultValue={s.smtp_from ?? ""} placeholder="Get Xpress <noreply@getxpress.in>" className={field} /></L>
        <label className="flex items-center gap-2 text-sm"><input name="alert_on_booking" type="checkbox" defaultChecked={s.alert_on_booking} /> Email me on every new booking</label>
        <label className="flex items-center gap-2 text-sm"><input name="alert_on_application" type="checkbox" defaultChecked={s.alert_on_application} /> Email me on every hub application</label>
        <p className="text-xs text-muted-foreground md:col-span-2">The app password is kept as a protected secret, never on this page. Emails start once the sender is connected.</p>
      </section>
      <section className="grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-2">
        <h3 className="font-bold md:col-span-2">Payments & OTP</h3>
        <L label="Payment gateway"><select name="payment_provider" defaultValue={s.payment_provider} className={field}><option value="none">Not connected (pay at pickup only)</option><option value="razorpay">Razorpay</option><option value="phonepe">PhonePe</option><option value="cashfree">Cashfree</option></select></L>
        <L label="Public key ID"><input name="payment_key_id" defaultValue={s.payment_key_id ?? ""} placeholder="rzp_live_…" className={field} /></L>
        <label className="flex items-center gap-2 text-sm"><input name="payment_live" type="checkbox" defaultChecked={s.payment_live} /> Live mode</label>
        <div />
        <L label="OTP delivery"><select name="otp_provider" defaultValue={s.otp_provider} className={field}><option value="screen">Show on screen (testing)</option><option value="msg91">MSG91</option><option value="twilio">Twilio</option><option value="fast2sms">Fast2SMS</option></select></L>
        <L label="SMS sender ID"><input name="otp_sender_id" maxLength={6} defaultValue={s.otp_sender_id ?? ""} placeholder="GTXPRS" className={field} /></L>
      </section>
      <section className="grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-2">
        <h3 className="font-bold md:col-span-2">WhatsApp, API & webhooks</h3>
        <L label="WhatsApp business number"><input name="whatsapp_number" defaultValue={s.whatsapp_number ?? ""} placeholder="+91…" className={field} /></L>
        <label className="flex items-center gap-2 text-sm"><input name="whatsapp_enabled" type="checkbox" defaultChecked={s.whatsapp_enabled} /> Show WhatsApp chat button</label>
        <L label="Webhook URL (status updates)"><input name="webhook_url" type="url" defaultValue={s.webhook_url ?? ""} placeholder="https://…" className={field} /></L>
        <label className="flex items-center gap-2 text-sm"><input name="api_enabled" type="checkbox" defaultChecked={s.api_enabled} /> Allow seller API access</label>
      </section>
      <Button type="submit" className="h-12">Save integrations</Button>
    </form>}</>
  );
}
