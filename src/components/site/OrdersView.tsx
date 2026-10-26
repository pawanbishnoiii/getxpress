import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreditCard, Download, Printer, Search } from "lucide-react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";
import { switchToCashOnPickup } from "@/lib/shipments.functions";
import { notifyStatusEmail } from "@/lib/staff.functions";



const TABS = [["all", "All"], ["awaiting_payment", "Unpaid"], ["booked", "Ready to ship"], ["picked_up", "Picked up"], ["in_transit", "In transit"], ["out_for_delivery", "Out for delivery"], ["delivered", "Delivered"], ["cancelled", "Cancelled"]] as const;

type SortKey = { key: string; dir: "asc" | "desc" };
const BULK = [["picked_up", "Picked up"], ["in_transit", "Dispatched / in transit"], ["out_for_delivery", "Out for delivery"], ["delivered", "Delivered"]] as const;

export function OrdersView() {
  const { isStaff } = useRoles();
  const qc = useQueryClient();
  const toCash = useServerFn(switchToCashOnPickup);
  const notify = useServerFn(notifyStatusEmail);
  const [tab, setTab] = useState<string>("all");
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"mine" | "scope">("mine");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["orders", scope],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      let query = supabase.from("shipments").select("id,tracking_number,status,sender_name,sender_city,sender_pincode,receiver_name,receiver_city,receiver_pincode,price,discount,coupon_code,created_at,service,pieces_count,payment_method,payment_status").order("created_at", { ascending: false }).limit(500);
      if (!u.user) throw new Error("Sign in to view orders.");
      if (scope === "mine") query = query.eq("user_id", u.user.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    const ch = supabase.channel("orders-live").on("postgres_changes", { event: "*", schema: "public", table: "shipments" }, () => qc.invalidateQueries({ queryKey: ["orders"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [pin, setPin] = useState("");
  const [sorts, setSorts] = useState<SortKey[]>([{ key: "created_at", dir: "desc" }]);
  const [sel, setSel] = useState<Set<string>>(new Set()); const [bulk, setBulk] = useState("");
  const list = useMemo(() => {
    const f = rows.filter((r) => (tab === "all" || r.status === tab)
      && (!q || [r.tracking_number, r.receiver_name, r.receiver_city, r.receiver_pincode, r.sender_city].join(" ").toLowerCase().includes(q.toLowerCase()))
      && (!pin || r.receiver_pincode?.startsWith(pin) || r.sender_pincode?.startsWith(pin))
      && (!from || r.created_at >= from) && (!to || r.created_at.slice(0, 10) <= to));
    return [...f].sort((a, b) => { for (const s of sorts) { const av = (a as Record<string, unknown>)[s.key], bv = (b as Record<string, unknown>)[s.key]; const c = typeof av === "number" || s.key === "price" ? Number(av) - Number(bv) : String(av ?? "").localeCompare(String(bv ?? "")); if (c) return s.dir === "asc" ? c : -c; } return 0; });
  }, [rows, tab, q, pin, from, to, sorts]);
  const sortBy = (key: string, multi: boolean) => setSorts((cur) => { const ex = cur.find((c) => c.key === key); const nx: SortKey = { key, dir: ex?.dir === "asc" ? "desc" : "asc" }; return multi ? [...cur.filter((c) => c.key !== key), nx] : [nx]; });
  const arrow = (key: string) => { const i = sorts.findIndex((c) => c.key === key); return i < 0 ? "" : `${sorts[i]!.dir === "asc" ? "↑" : "↓"}${sorts.length > 1 ? i + 1 : ""}`; };
  const applyBulk = async () => {
    if (!bulk || !sel.size) return;
    const { error } = await supabase.from("shipments").update({ status: bulk } as never).in("id", [...sel]);
    if (error) { toast.error(error.message); return; }
    void notify({ data: { ids: [...sel] } }).catch(() => {});
    toast.success(`${sel.size} orders marked ${bulk.replaceAll("_", " ")}`); setSel(new Set()); setBulk(""); qc.invalidateQueries({ queryKey: ["orders"] });
  };
  const exportCsv = () => {
    const head = ["awb", "status", "from_city", "from_pin", "receiver", "to_city", "to_pin", "parcels", "payment", "price", "booked"];
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = [head.join(","), ...list.map((r) => [r.tracking_number, r.status, r.sender_city, r.sender_pincode, r.receiver_name, r.receiver_city, r.receiver_pincode, r.pieces_count, r.payment_method, r.price, r.created_at].map(esc).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "getxpress-orders.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(list.map((r) => ({ awb: r.tracking_number, status: r.status, from: `${r.sender_city} ${r.sender_pincode}`, to: `${r.receiver_name}, ${r.receiver_city} ${r.receiver_pincode}`, parcels: r.pieces_count, service: r.service, payment: r.payment_method, payment_status: r.payment_status, coupon: r.coupon_code ?? "", discount: r.discount, price: r.price, booked: r.created_at })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "orders"); XLSX.writeFile(wb, "getxpress-orders.xlsx");
  };

  return (
    <AppShell wide>
      <PageHeader title="Orders" sub={`${list.length} of ${rows.length} orders`} action={
        <div className="flex gap-2">
          {isStaff && <select value={scope} onChange={(e) => setScope(e.target.value as "mine")} className="h-10 rounded-xl border bg-card px-3 text-sm font-bold"><option value="mine">My orders</option><option value="scope">All in my scope</option></select>}
          <button onClick={exportXlsx} className="flex h-10 items-center gap-1.5 rounded-xl border bg-card px-3 text-sm font-bold"><Download className="h-4 w-4" /> Excel</button>
          <button onClick={exportCsv} className="flex h-10 items-center gap-1.5 rounded-xl border bg-card px-3 text-sm font-bold"><Download className="h-4 w-4" /> CSV</button>
          <Link to="/users/addorder" className="flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">+ Add order</Link>
        </div>} />
      <div className="flex gap-1 overflow-x-auto border-b">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{l} <span className="text-xs">({k === "all" ? rows.length : rows.filter((r) => r.status === k).length})</span></button>)}
      </div>
      <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border bg-card px-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search AWB, name, city, pincode" className="flex-1 bg-transparent text-sm font-semibold outline-none" /></label>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Pincode" className="h-10 w-28 rounded-xl border bg-card px-3 font-semibold" />
        <label className="flex items-center gap-1 font-semibold text-muted-foreground">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl border bg-card px-2 text-foreground" /></label>
        <label className="flex items-center gap-1 font-semibold text-muted-foreground">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl border bg-card px-2 text-foreground" /></label>
        {isStaff && sel.size > 0 && <div className="ml-auto flex items-center gap-2 rounded-xl bg-ink px-3 py-1.5 text-ink-foreground"><span className="font-bold">{sel.size} selected</span><select value={bulk} onChange={(e) => setBulk(e.target.value)} className="h-8 rounded-lg bg-card px-2 text-foreground"><option value="">Mark as…</option>{BULK.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><button onClick={applyBulk} disabled={!bulk} className="rounded-lg bg-primary px-3 py-1 font-bold text-primary-foreground disabled:opacity-50">Apply</button></div>}
      </div>

      <div className="mt-4 hidden overflow-hidden rounded-lg border bg-card lg:block">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground"><tr>{isStaff && <th className="pl-3"><input type="checkbox" aria-label="Select all" checked={list.length > 0 && sel.size === list.length} onChange={(e) => setSel(e.target.checked ? new Set(list.map((r) => r.id)) : new Set())} /></th>}<th className="cursor-pointer p-3" title="Shift+click to sort by more columns" onClick={(e) => sortBy("created_at", e.shiftKey)}>Order / AWB {arrow("created_at")}</th><th className="cursor-pointer" onClick={(e) => sortBy("receiver_city", e.shiftKey)}>Route {arrow("receiver_city")}</th><th>Parcels</th><th>Payment</th><th className="cursor-pointer" onClick={(e) => sortBy("status", e.shiftKey)}>Status {arrow("status")}</th><th className="cursor-pointer text-right" onClick={(e) => sortBy("price", e.shiftKey)}>Amount {arrow("price")}</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-t">
                {isStaff && <td className="pl-3"><input type="checkbox" aria-label={`Select ${s.tracking_number}`} checked={sel.has(s.id)} onChange={(e) => setSel((cur) => { const n = new Set(cur); if (e.target.checked) n.add(s.id); else n.delete(s.id); return n; })} /></td>}
                <td className="p-3"><Link to="/users/dashboard" search={{ track: s.tracking_number }} className="font-mono font-bold text-primary">{s.tracking_number}</Link><p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("en-IN")}</p></td>
                <td>{s.sender_city} → {s.receiver_city}<p className="text-xs text-muted-foreground">{s.receiver_name} · {s.receiver_pincode}</p></td>
                <td>{s.pieces_count}</td>
                <td className="capitalize">{s.payment_method.replaceAll("_", " ")}<p className="text-xs text-muted-foreground">{s.payment_status.replaceAll("_", " ")}</p></td>
                <td><span className="rounded-full bg-cream px-2.5 py-1 text-xs font-bold capitalize">{s.status.replaceAll("_", " ")}</span></td>
                <td className="text-right font-bold">₹{s.price}{Number(s.discount) > 0 && <p className="text-xs font-semibold text-primary">−₹{s.discount} {s.coupon_code}</p>}</td>
                <td className="p-3 text-right"><Actions s={s} onCash={async () => { try { await toCash({ data: { awb: s.tracking_number } }); toast.success("Confirmed with pay at pickup"); qc.invalidateQueries({ queryKey: ["orders"] }); } catch (e) { toast.error((e as Error).message); } }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && list.length === 0 && <p className="p-10 text-center text-muted-foreground">No orders here.</p>}
      </div>

      <div className="mt-4 space-y-2 lg:hidden">
        {list.map((s) => (
          <div key={s.id} className="rounded-lg border bg-card p-4">
            <div className="flex justify-between"><Link to="/users/dashboard" search={{ track: s.tracking_number }} className="font-mono text-sm font-bold text-primary">{s.tracking_number}</Link><span className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-bold capitalize">{s.status.replaceAll("_", " ")}</span></div>
            <p className="mt-1 font-bold">{s.sender_city} → {s.receiver_city}</p>
            <p className="text-xs text-muted-foreground">{s.pieces_count} parcel · ₹{s.price}</p>
            <div className="mt-3"><Actions s={s} onCash={async () => { try { await toCash({ data: { awb: s.tracking_number } }); qc.invalidateQueries({ queryKey: ["orders"] }); } catch (e) { toast.error((e as Error).message); } }} /></div>
          </div>
        ))}
        {!isLoading && list.length === 0 && <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No orders here.</p>}
      </div>
    </AppShell>
  );
}

function Actions({ s, onCash }: { s: { id: string; status: string }; onCash: () => void }) {
  if (s.status === "awaiting_payment") return (
    <div className="flex justify-end gap-1.5">
      <Link to="/pay/$shipmentId" params={{ shipmentId: s.id }} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><CreditCard className="h-3.5 w-3.5" /> Pay</Link>
      <button onClick={onCash} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Pay at pickup</button>
    </div>
  );
  if (s.status === "cancelled") return null;
  return <Link to="/labels/$shipmentId" params={{ shipmentId: s.id }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold"><Printer className="h-3.5 w-3.5" /> Labels</Link>;
}
