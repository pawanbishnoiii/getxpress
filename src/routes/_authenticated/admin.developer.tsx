import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";

export const Route = createFileRoute("/_authenticated/admin/developer")({
  head: () => ({ meta: [{ title: "Developer — API & webhooks — Get Xpress" }, { name: "description", content: "Get Xpress API endpoints, webhooks and hosting checklist for admins." }, { property: "og:title", content: "Developer — Get Xpress" }, { property: "og:description", content: "API endpoints, webhooks and hosting checklist." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Developer,
});

const ENDPOINTS = [
  ["GET", "/api/public/health-check", "Uptime check for monitors"],
  ["POST", "/api/public/shipglobal/webhook", "International shipment status updates"],
  ["POST", "/api/public/whatsapp/webhook", "Incoming WhatsApp messages"],
  ["POST", "/api/public/help-chat", "AI help chat"],
  ["POST", "/api/public/track-assistant", "AI tracking assistant"],
];
const ENV = [
  ["VITE_SUPABASE_URL / SUPABASE_URL", "Database address"],
  ["VITE_SUPABASE_PUBLISHABLE_KEY / SUPABASE_PUBLISHABLE_KEY", "Public key"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Server-only admin key (never VITE_)"],
  ["SHIPGLOBAL_API_KEY", "International live rates"],
  ["SMTP_USERNAME / SMTP_PASSWORD", "Outgoing email"],
  ["PUBLIC_BASE_URL", "Your site address used in email links"],
];

function Developer() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <AppShell wide>
      <h1 className="font-display text-3xl font-extrabold">Developer</h1>
      <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
        <Link to="/admin/gateways/$category" params={{ category: "payment" }} className="rounded-lg border bg-card px-3 py-2">API keys & gateways</Link>
        <Link to="/admin/diagnostics" className="rounded-lg border bg-card px-3 py-2">System health</Link>
        <Link to="/admin/audit" className="rounded-lg border bg-card px-3 py-2">Audit log</Link>
      </div>
      <section className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="font-bold">Public endpoints & webhooks</h2>
        <ul className="mt-3 space-y-2">{ENDPOINTS.map(([m, p, d]) => <li key={p} className="rounded-lg bg-muted px-3 py-2 text-sm"><span className="font-mono font-bold text-primary">{m}</span> <span className="break-all font-mono">{origin}{p}</span><p className="text-xs text-muted-foreground">{d}</p></li>)}</ul>
      </section>
      <section className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="font-bold">Hosting checklist (Vercel or elsewhere)</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add these settings in your host's environment variables. Email sending needs a host that supports outgoing mail connections.</p>
        <ul className="mt-3 space-y-1 text-sm">{ENV.map(([k, d]) => <li key={k}><span className="font-mono font-bold">{k}</span> — {d}</li>)}</ul>
      </section>
    </AppShell>
  );
}
