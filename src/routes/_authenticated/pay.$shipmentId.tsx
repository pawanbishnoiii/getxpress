import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, CreditCard, Loader2, ShieldAlert, Smartphone, Wallet } from "lucide-react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { demoPay } from "@/lib/shipments.functions";

export const Route = createFileRoute("/_authenticated/pay/$shipmentId")({
  head: () => ({ meta: [{ title: "Pay for shipment — Get Xpress" }, { name: "description", content: "Complete payment for your Get Xpress booking." }, { property: "og:title", content: "Pay — Get Xpress" }, { property: "og:description", content: "Complete payment for your Get Xpress booking." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Pay,
});

const METHODS = [["upi", "UPI", Smartphone], ["card", "Card", CreditCard], ["netbanking", "Netbanking", Building2], ["wallet", "Wallet", Wallet]] as const;

function Pay() {
  const { shipmentId } = Route.useParams();
  const pay = useServerFn(demoPay);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [method, setMethod] = useState<(typeof METHODS)[number][0]>("upi");
  const [busy, setBusy] = useState(false);
  const { data: s } = useQuery({ queryKey: ["ship", shipmentId], queryFn: async () => (await supabase.from("shipments").select("*").eq("id", shipmentId).maybeSingle()).data });
  const { data: attempts = [] } = useQuery({ queryKey: ["payments", shipmentId], queryFn: async () => (await supabase.from("payments").select("*").eq("shipment_id", shipmentId).order("created_at", { ascending: false })).data ?? [] });

  const run = async (outcome: "success" | "failure") => {
    setBusy(true);
    try {
      const r = await pay({ data: { shipmentId, method, outcome } });
      qc.invalidateQueries();
      if (r.ok) { toast.success(`Payment ${r.ref} captured (demo)`); navigate({ to: "/labels/$shipmentId", params: { shipmentId } }); }
      else toast.error("Payment failed (demo). Booking stays unpaid — no label issued.");
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  return (
    <AppShell>
      <PageHeader title="Checkout" sub={s ? `AWB ${s.tracking_number}` : ""} />
      <div className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-dashed border-primary bg-primary/5 p-4 text-sm">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p><b>Razorpay demo mode.</b> No real money is charged. Live payments need Razorpay Key ID and Key Secret — once added, this screen will open the real Razorpay checkout.</p>
      </div>
      {s && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-3xl border bg-card p-5">
            <p className="font-bold">Choose payment method</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {METHODS.map(([k, label, Icon]) => (
                <button key={k} onClick={() => setMethod(k)} className={`flex items-center gap-2 rounded-2xl border p-4 font-bold ${method === k ? "border-primary bg-primary/5 ring-2 ring-primary" : ""}`}><Icon className="h-5 w-5" />{label}</button>
              ))}
            </div>
            {s.status === "awaiting_payment" ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button disabled={busy} onClick={() => run("success")} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Pay ₹{s.price} (demo success)</button>
                <button disabled={busy} onClick={() => run("failure")} className="h-14 rounded-2xl border font-bold">Simulate failure</button>
              </div>
            ) : <p className="mt-5 rounded-2xl bg-muted p-4 font-semibold">This booking is {s.status.replaceAll("_", " ")} — no payment needed. <Link to="/labels/$shipmentId" params={{ shipmentId }} className="text-primary">Open labels →</Link></p>}
          </div>
          <div className="rounded-3xl bg-ink p-5 text-ink-foreground">
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">Order summary</p>
            <p className="mt-2 font-bold">{s.sender_city} → {s.receiver_city}</p>
            <p className="text-sm opacity-70">{s.pieces_count} parcel · {s.weight_kg} kg · {s.service}</p>
            {Number(s.discount) > 0 && <p className="mt-3 text-sm">Coupon {s.coupon_code}: −₹{s.discount}</p>}
            <p className="mt-4 font-display text-4xl font-extrabold">₹{s.price}</p>
            {attempts.length > 0 && <div className="mt-4 space-y-1 border-t border-ink-foreground/20 pt-3 text-xs">{attempts.map((a) => <p key={a.id}>{a.provider_ref} · {a.method} · <b>{a.status}</b></p>)}</div>}
          </div>
        </div>
      )}
    </AppShell>
  );
}
