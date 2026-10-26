import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { AppShell, PageHeader, Stat } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Get Xpress" }, { name: "description", content: "Hub wallet balance, top-ups, booking deductions and commissions." }, { property: "og:title", content: "Wallet — Get Xpress" }, { property: "og:description", content: "Hub wallet balance and history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: WalletPage,
});

function WalletPage() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me-id"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? "" });
  const { data: tx = [], error } = useQuery({
    queryKey: ["wallet", me], enabled: !!me,
    queryFn: async () => { const r = await supabase.from("wallet_transactions").select("*").eq("user_id", me ?? "").order("created_at", { ascending: false }).limit(500); if (r.error) throw r.error; return r.data; },
  });
  useEffect(() => {
    const ch = supabase.channel("wallet-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "wallet_transactions" }, () => qc.invalidateQueries({ queryKey: ["wallet"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  const sum = (k: string) => tx.filter((t) => t.kind === k).reduce((a, t) => a + Number(t.amount), 0);
  const {data:walletBalance}=useQuery({queryKey:["wallet-balance",me,tx.length],enabled:!!me,queryFn:async()=>Number((await supabase.rpc("wallet_balance",{_user:me??""})).data??0)});
  const balance = walletBalance??0;
  return (
    <AppShell wide>
      <PageHeader title="Wallet" sub="Bookings, deposits and payouts" action={<Button asChild variant="outline"><Link to="/wallet-transactions">Transactions</Link></Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Balance (₹)" value={balance.toLocaleString("en-IN")} tone="ink" />
        <Stat label="Added (₹)" value={sum("topup").toLocaleString("en-IN")} />
        <Stat label="Bookings (₹)" value={Math.abs(sum("order_debit")).toLocaleString("en-IN")} tone="primary" />
        <Stat label="Commission (₹)" value={sum("commission").toLocaleString("en-IN")} tone="lime" />
      </div>
      <Deposit />
      <Withdraw balance={balance} />
      
      {error && <p className="mt-4 text-destructive">Wallet could not load.</p>}
      <div className="mt-5 overflow-x-auto rounded-2xl border bg-card">
        <table className="enterprise-table"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Note</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{tx.map((t) => (
            <tr key={t.id}><td>{new Date(t.created_at).toLocaleString("en-IN")}</td><td className="capitalize">{Number(t.amount) >= 0 ? <ArrowDownLeft className="mr-1 inline h-4 w-4 text-primary" /> : <ArrowUpRight className="mr-1 inline h-4 w-4 text-destructive" />}{t.kind}</td><td className="font-mono text-xs">{t.ref}</td><td>{t.note}</td><td className={`text-right font-bold ${Number(t.amount) < 0 ? "text-destructive" : ""}`}>₹{Number(t.amount).toLocaleString("en-IN")}</td></tr>
          ))}</tbody></table>
        {tx.length === 0 && <p className="p-10 text-center text-muted-foreground">No wallet activity yet.</p>}
      </div>
    </AppShell>
  );
}

function Withdraw({ balance }: { balance: number }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState<"upi" | "bank">("upi");
  const [details, setDetails] = useState("");
  const { data: reqs = [] } = useQuery({ queryKey: ["my-withdrawals"], queryFn: async () => (await supabase.from("wallet_withdrawals").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [] });
  const pending = reqs.filter((r) => r.status === "pending" || r.status === "approved").reduce((a, r) => a + Number(r.amount), 0);
  const submit = async () => {
    if (amount < 100) return toast.error("Minimum withdrawal is ₹100");
    if (amount > balance - pending) return toast.error("Amount is more than your available balance");
    if (details.trim().length < 5) return toast.error(method === "upi" ? "Enter your UPI ID" : "Enter account number and IFSC");
    const r = await supabase.from("wallet_withdrawals").insert({ amount, payout_method: method, payout_details: details.trim() });
    if (r.error) toast.error(r.error.message); else { toast.success("Withdrawal requested"); setDetails(""); qc.invalidateQueries({ queryKey: ["my-withdrawals"] }); }
    return undefined;
  };
  return (
    <div className="mt-5 rounded-2xl border bg-card p-5">
      <h3 className="flex items-center gap-2 font-bold"><ArrowUpRight className="h-5 w-5 text-primary" />Withdraw money</h3>
      <p className="text-xs text-muted-foreground">Available ₹{Math.max(0, balance - pending).toLocaleString("en-IN")} · admin reviews and pays out, then your wallet is debited.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[140px_120px_1fr_auto]">
        <input aria-label="Withdraw amount" type="number" min={100} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-11 rounded-xl border bg-background px-3 font-bold" />
        <select aria-label="Payout method" value={method} onChange={(e) => setMethod(e.target.value as "upi")} className="h-11 rounded-xl border bg-background px-3"><option value="upi">UPI</option><option value="bank">Bank</option></select>
        <input aria-label="Payout details" maxLength={200} value={details} onChange={(e) => setDetails(e.target.value)} placeholder={method === "upi" ? "name@upi" : "Account no. · IFSC · name"} className="h-11 rounded-xl border bg-background px-3" />
        <Button className="h-11" onClick={submit}>Request payout</Button>
      </div>
      {reqs.length > 0 && <ul className="mt-4 divide-y text-sm">{reqs.map((r) => <li key={r.id} className="flex justify-between py-2"><span>{new Date(r.created_at).toLocaleDateString("en-IN")} · {r.payout_method.toUpperCase()}</span><span className="font-semibold">₹{Number(r.amount).toLocaleString("en-IN")} · <span className="capitalize">{r.status}</span></span></li>)}</ul>}
    </div>
  );
}

function Deposit() {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(1000);
  const [utr, setUtr] = useState("");
  const [method, setMethod] = useState<"upi" | "bank">("upi");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: co } = useQuery({ queryKey: ["public-company"], queryFn: async () => ((await supabase.rpc("public_company")).data ?? {}) as Record<string, string | null> });
  const { data: pay } = useQuery({ queryKey: ["deposit-instructions"], queryFn: async () => ((await supabase.rpc("deposit_instructions")).data ?? null) as Record<string, string | null> | null });
  const { data: reqs = [] } = useQuery({ queryKey: ["my-deposits"], queryFn: async () => (await supabase.from("wallet_deposits").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [] });
  const submit = async () => {
    if (amount < 100) return toast.error("Minimum deposit is ₹100");
    const u = utr.trim().toUpperCase();
    if (!/^[A-Z0-9]{8,22}$/.test(u)) return toast.error("Enter the UTR / reference number from your payment (8–22 letters or digits)");
    if (!file) return toast.error("Attach a screenshot or photo of the payment");
    if (file.size > 5 * 1024 * 1024) return toast.error("Photo must be under 5 MB");
    setBusy(true);
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const path = `${uid}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
      const up = await supabase.storage.from("deposit-proofs").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const r = await supabase.from("wallet_deposits").insert({ amount, utr: u, method, proof_path: path });
      if (r.error) throw new Error(r.error.code === "23505" ? "This UTR was already submitted" : r.error.message);
      toast.success("Deposit sent for approval"); setUtr(""); setFile(null);
      qc.invalidateQueries({ queryKey: ["my-deposits"] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    return undefined;
  };
  return (
    <div className="mt-5 rounded-2xl border bg-card p-5">
      <h3 className="flex items-center gap-2 font-bold"><Plus className="h-5 w-5 text-primary" />Add money</h3>
      <p className="text-xs text-muted-foreground">Pay by UPI or bank transfer to {co?.["company_name"] ?? "GetXpress"}{co?.["support_whatsapp"] ? ` (help: ${co["support_whatsapp"]})` : ""}, then enter the UTR and attach the payment screenshot. Admin approves and your balance updates. This is real money.</p>
      {pay && (pay["upi_id"] || pay["account_no"]) ? <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {pay["upi_id"] && <div className="rounded-xl border bg-muted/40 p-3 text-sm"><p className="text-xs font-bold uppercase text-primary">UPI</p><p className="mt-1 font-mono font-bold">{pay["upi_id"]}</p>{pay["upi_name"] && <p className="text-xs text-muted-foreground">{pay["upi_name"]}</p>}<button type="button" className="mt-1 text-xs font-semibold text-primary" onClick={() => { navigator.clipboard.writeText(pay["upi_id"]!); toast.success("UPI ID copied"); }}>Copy</button></div>}
        {pay["account_no"] && <div className="rounded-xl border bg-muted/40 p-3 text-sm"><p className="text-xs font-bold uppercase text-primary">Bank transfer</p><p className="mt-1 font-semibold">{pay["account_name"]}</p><p className="font-mono">{pay["account_no"]} · {pay["ifsc"]}</p><p className="text-xs text-muted-foreground">{pay["bank_name"]}</p></div>}
        {pay["instructions"] && <p className="text-xs text-muted-foreground sm:col-span-2">{pay["instructions"]}</p>}
      </div> : <p className="mt-3 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">Payment details are not set up yet. Please contact support.</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-[130px_110px_1fr_1fr_auto]">
        <input aria-label="Deposit amount" type="number" min={100} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-11 rounded-xl border bg-background px-3 font-bold" />
        <select aria-label="Deposit method" value={method} onChange={(e) => setMethod(e.target.value as "upi")} className="h-11 rounded-xl border bg-background px-3"><option value="upi">UPI</option><option value="bank">Bank</option></select>
        <input aria-label="UTR number" maxLength={22} value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="UTR / reference no." className="h-11 rounded-xl border bg-background px-3 font-mono" />
        <input aria-label="Payment photo" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="h-11 rounded-xl border bg-background px-3 py-2 text-xs" />
        <Button className="h-11" disabled={busy} onClick={submit}>{busy ? "Sending…" : "Submit"}</Button>
      </div>
      {reqs.length > 0 && <ul className="mt-4 divide-y text-sm">{reqs.map((r) => <li key={r.id} className="flex justify-between py-2"><span>{new Date(r.created_at).toLocaleDateString("en-IN")} · <span className="font-mono">{r.utr}</span></span><span className="font-semibold">₹{Number(r.amount).toLocaleString("en-IN")} · <span className={r.status === "rejected" ? "text-destructive capitalize" : "capitalize"}>{r.status}</span></span></li>)}</ul>}
    </div>
  );
}
