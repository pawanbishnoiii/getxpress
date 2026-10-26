import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Loader2, XCircle, Info } from "lucide-react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/hooks/use-roles";
import { mapsDiagnostics } from "@/lib/maps.functions";
import { lookupPins } from "@/lib/pin-lookup";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/diagnostics")({
  head: () => ({ meta: [{ title: "System diagnostics — Get Xpress" }, { name: "description", content: "Check maps, address lookup, suggestions and service setup." }, { property: "og:title", content: "Get Xpress diagnostics" }, { property: "og:description", content: "Admin health checks for maps and services." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Diagnostics,
});

type Check = { name: string; ok: boolean; detail: string; ms?: number; warn?: boolean };

function browserMapCheck(): Promise<Check> {
  const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
  const host = window.location.hostname;
  if (!key) return Promise.resolve({ name: "Map display", ok: false, detail: "No browser map key — pickup maps use the free OpenStreetMap view." });
  if (!/\.lovable\.app$|\.lovableproject\.com$|^localhost$/.test(host)) return Promise.resolve({ name: "Map display", ok: false, warn: true, detail: `This domain (${host}) is not allowed for the managed map key. A custom domain needs your own Google key; free map is used meanwhile.` });
  const t = Date.now();
  return new Promise((resolve) => {
    const w = window as Window & { google?: { maps?: unknown }; gxDiag?: () => void; gm_authFailure?: () => void };
    w.gm_authFailure = () => resolve({ name: "Map display", ok: false, detail: "Google rejected the map key for this site (authorization failure)." });
    if (w.google?.maps) { resolve({ name: "Map display", ok: true, detail: "Google Maps already loaded.", ms: 0 }); return; }
    w.gxDiag = () => resolve({ name: "Map display", ok: true, detail: "Google Maps script loaded.", ms: Date.now() - t });
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=gxDiag&channel=${import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] ?? ""}`;
    s.onerror = () => resolve({ name: "Map display", ok: false, detail: "Map script blocked or offline — free map fallback will be shown." });
    document.head.appendChild(s);
    setTimeout(() => resolve({ name: "Map display", ok: false, detail: "Map script did not respond in 10s." }), 10000);
  });
}

function Diagnostics() {
  const { isAdmin } = useRoles();
  const run = useServerFn(mapsDiagnostics);
  const [checks, setChecks] = useState<Check[]>([]);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); const out: Check[] = [];
    out.push(await browserMapCheck());
    try { out.push(...(await run())); } catch (e) { out.push({ name: "Server map checks", ok: false, detail: (e as Error).message }); }
    const { count } = await supabase.from("pincodes").select("pincode", { count: "exact", head: true });
    out.push({ name: "Serviceable pincodes", ok: (count ?? 0) > 0, detail: count ? `${count.toLocaleString("en-IN")} pincodes loaded.` : "None loaded — every booking will be rejected. Use Pincodes & staff → Load full India list." });
    const t = Date.now(); const s = await lookupPins("Malviya Nagar").catch(() => []);
    out.push({ name: "Pincode box suggestions", ok: s.length > 0, detail: s.length ? `${s.length} suggestions (${s.some((x) => x.source === "map") ? "includes map results" : "pincode list only"}).` : "No suggestions for 'Malviya Nagar'.", ms: Date.now() - t });
    const { data: integ } = await supabase.from("integration_settings").select("*").maybeSingle();
    out.push({ name: "SMS / OTP", ok: false, warn: true, detail: `Provider: ${integ?.otp_provider ?? "none"}. No SMS key yet — codes are shown on screen (demo mode).` });
    out.push({ name: "Payments", ok: false, warn: true, detail: `Provider: ${integ?.payment_provider ?? "none"}. No Razorpay key yet — payments are demo only.` });
    out.push({ name: "Email (SMTP)", ok: !!integ?.smtp_host, warn: !integ?.smtp_host, detail: integ?.smtp_host ? `SMTP ${integ.smtp_host}:${integ.smtp_port ?? ""} saved. Sending is not verified here.` : "Not set. Add it in Settings & integrations." });
    setChecks(out); setBusy(false);
  };
  return (
    <AppShell wide>
      <PageHeader title="System diagnostics" sub="Checks map display, address lookup, location suggestions and connected services, and tells you what falls back." />
      {!isAdmin ? <p>Admin access required.</p> : <>
        <Button onClick={go} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Run checks</Button>
        <p className="mt-2 text-xs text-muted-foreground">Runs 3 small Google requests.</p>
        <ul className="mt-5 space-y-2">
          {checks.map((c) => (
            <li key={c.name} className="flex items-start gap-3 rounded-lg border bg-card p-3">
              {c.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" /> : c.warn ? <Info className="mt-0.5 h-5 w-5 text-primary" /> : <XCircle className="mt-0.5 h-5 w-5 text-destructive" />}
              <div><p className="font-bold">{c.name}{c.ms != null && <span className="ml-2 text-xs font-normal text-muted-foreground">{c.ms} ms</span>}</p><p className="text-sm text-muted-foreground">{c.detail}</p></div>
            </li>
          ))}
        </ul>
      </>}
    </AppShell>
  );
}
