import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { DataGrid, type Col } from "@/components/site/DataGrid";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/payouts")({
  head: () => ({ meta: [
    { title: "Wallet deposits & payouts — GetXpress Admin" },
    { name: "description", content: "Approve, pay or reject hub wallet withdrawal requests." },
    { property: "og:title", content: "GetXpress hub payouts" },
    { property: "og:description", content: "Hub wallet withdrawal approvals." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Payouts,
});

type Row = { id: string; user_id: string; amount: number; payout_method: string; payout_details: string; status: string; created: string };

function Payouts() {
  const { isAdmin } = useRoles();
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["payouts"], enabled: isAdmin,
    queryFn: async () => ((await supabase.from("wallet_withdrawals").select("*").order("created_at", { ascending: false }).limit(2000)).data ?? []).map((r): Row => ({ id: r.id, user_id: r.user_id, amount: Number(r.amount), payout_method: r.payout_method, payout_details: r.payout_details, status: r.status, created: new Date(r.created_at).toLocaleString("en-IN") })),
  });
  if (!isAdmin) return <AppShell><p>Admin access required.</p></AppShell>;
  const set = async (ids: string[], status: string) => {
    const r = await supabase.from("wallet_withdrawals").update({ status }).in("id", ids);
    if (r.error) toast.error(r.error.message); else { toast.success(`${ids.length} marked ${status}`); qc.invalidateQueries({ queryKey: ["payouts"] }); }
  };
  const cols: Col<Row>[] = [
    { key: "created", label: "Requested" }, { key: "amount", label: "Amount ₹", render: (r) => `₹${r.amount.toLocaleString("en-IN")}` },
    { key: "payout_method", label: "Method" }, { key: "payout_details", label: "UPI / bank" }, { key: "status", label: "Status", render: (r) => <span className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold capitalize">{r.status}</span> },
    { key: "user_id", label: "Hub ID", render: (r) => <span className="font-mono text-xs">{r.user_id.slice(0, 8)}</span> },
  ];
  return (
    <AppShell wide>
      <PageHeader title="Manual gateway" sub="Your UPI and bank details shown in every hub wallet, plus deposit and payout approvals. Amounts are real money." />
      <PayDetails />
      <Deposits />
      <div className="mt-8"><PageHeader title="Hub payouts" sub="Tick requests, then approve, mark paid (wallet is debited automatically) or reject." /></div>
      <DataGrid name="hub-payouts" rows={rows} cols={cols} rowKey={(r) => r.id} actions={(sel) => sel.length ? <>
        <Button size="sm" variant="outline" onClick={() => set(sel.filter((r) => r.status === "pending").map((r) => r.id), "approved")}>Approve</Button>
        <Button size="sm" onClick={() => set(sel.filter((r) => r.status !== "paid" && r.status !== "rejected").map((r) => r.id), "paid")}>Mark paid</Button>
        <Button size="sm" variant="destructive" onClick={() => set(sel.filter((r) => r.status === "pending").map((r) => r.id), "rejected")}>Reject</Button>
      </> : null} />
    </AppShell>
  );
}

type Dep = { id: string; user_id: string; amount: number; utr: string; method: string; proof_path: string | null; status: string; created: string };
function Deposits() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ["deposits"], queryFn: async () => ((await supabase.from("wallet_deposits").select("*").order("created_at", { ascending: false }).limit(2000)).data ?? []).map((r): Dep => ({ id: r.id, user_id: r.user_id, amount: Number(r.amount), utr: r.utr, method: r.method, proof_path: r.proof_path, status: r.status, created: new Date(r.created_at).toLocaleString("en-IN") })) });
  const view = async (path: string | null) => { if (!path) return; const r = await supabase.storage.from("deposit-proofs").createSignedUrl(path, 300); if (r.data) window.open(r.data.signedUrl, "_blank", "noopener"); else toast.error("Photo unavailable"); };
  const set = async (ids: string[], status: string) => {
    if (!ids.length) return toast.error("Only pending deposits can be reviewed");
    const r = await supabase.from("wallet_deposits").update({ status }).in("id", ids);
    if (r.error) toast.error(r.error.message); else { toast.success(`${ids.length} ${status}`); qc.invalidateQueries({ queryKey: ["deposits"] }); }
    return undefined;
  };
  const cols: Col<Dep>[] = [
    { key: "created", label: "Submitted" }, { key: "amount", label: "Amount ₹", render: (r) => `₹${r.amount.toLocaleString("en-IN")}` },
    { key: "utr", label: "UTR", render: (r) => <span className="font-mono text-xs">{r.utr}</span> }, { key: "method", label: "Method" },
    { key: "proof_path", label: "Proof", render: (r) => r.proof_path ? <button className="text-primary underline" onClick={() => view(r.proof_path)}>View photo</button> : "—" },
    { key: "status", label: "Status", render: (r) => <span className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold capitalize">{r.status}</span> },
    { key: "user_id", label: "User", render: (r) => <span className="font-mono text-xs">{r.user_id.slice(0, 8)}</span> },
  ];
  return (
    <div className="mt-8">
      <PageHeader title="Wallet deposits" sub="Check the UTR and photo against your bank statement, then approve to credit the wallet." />
      <DataGrid name="wallet-deposits" rows={rows} cols={cols} rowKey={(r) => r.id} actions={(sel) => sel.length ? <>
        <Button size="sm" onClick={() => set(sel.filter((r) => r.status === "pending").map((r) => r.id), "approved")}>Approve & credit</Button>
        <Button size="sm" variant="destructive" onClick={() => set(sel.filter((r) => r.status === "pending").map((r) => r.id), "rejected")}>Reject</Button>
      </> : null} />
    </div>
  );
}

const PAY_FIELDS = [
  ["pay_upi_id", "UPI ID", "getxpress@upi"], ["pay_upi_name", "UPI name", "GetXpress Pvt Ltd"],
  ["pay_bank_name", "Bank name", "HDFC Bank"], ["pay_account_name", "Account holder", "GetXpress Pvt Ltd"],
  ["pay_account_no", "Account number", ""], ["pay_ifsc", "IFSC", "HDFC0000123"],
  ["pay_instructions", "Note for hubs", "Payments credited within 2 working hours"],
] as const;
function PayDetails() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["pay-details"], queryFn: async () => (await supabase.from("app_settings").select(PAY_FIELDS.map((f) => f[0]).join(",")).eq("id", true).maybeSingle()).data as Record<string, string | null> | null });
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), patch: Record<string, string | null> = {};
    for (const [k] of PAY_FIELDS) patch[k] = String(f.get(k) ?? "").trim() || null;
    if (patch["pay_upi_id"] && !/^[\w.-]{2,}@[a-z]{2,}$/i.test(patch["pay_upi_id"])) { toast.error("UPI ID looks wrong (e.g. name@okhdfc)"); return; }
    if (patch["pay_ifsc"] && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(patch["pay_ifsc"])) { toast.error("IFSC must look like HDFC0001234"); return; }
    const r = await supabase.from("app_settings").update(patch as never).eq("id", true);
    if (r.error) toast.error(r.error.message); else { toast.success("Payment details saved — hubs see them now"); qc.invalidateQueries({ queryKey: ["pay-details"] }); }
  };
  if (data === undefined) return null;
  return (
    <form key={JSON.stringify(data)} onSubmit={save} className="mb-8 rounded-2xl border bg-card p-5">
      <h3 className="font-bold">UPI & bank details for wallet top-ups</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PAY_FIELDS.map(([k, label, ph]) => <label key={k} className="text-sm font-semibold">{label}<input name={k} defaultValue={data?.[k] ?? ""} placeholder={ph} maxLength={200} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 font-normal" /></label>)}
      </div>
      <Button type="submit" className="mt-4">Save details</Button>
      <p className="mt-2 text-xs text-muted-foreground">Automatic top-ups: turn on Razorpay on the Payment gateways page once you have keys.</p>
    </form>
  );
}
