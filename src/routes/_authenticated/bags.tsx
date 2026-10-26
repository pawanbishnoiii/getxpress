import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { ScanButton } from "@/components/site/BarcodeScanner";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import { HubRoutes } from "@/components/site/HubRoutes";
import { buildBagLabelPdf, buildCodeSheetPdf, downloadBlob } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/bags")({
  head: () => ({ meta: [{ title: "Bags & manifests — Get Xpress" }, { name: "description", content: "Manage parcel bags, seals and transport manifests." }, { property: "og:title", content: "Get Xpress bags & manifests" }, { property: "og:description", content: "Scoped parcel bag and transport operations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Bags,
});

type Lookup = { found: boolean; bag_id?: string; bag_code?: string; status?: string; seal_no?: string | null; plastic_bag_code?: string | null; matched?: string; manifest_code?: string | null; manifest_status?: string | null };
const inp = "h-11 min-w-0 flex-1 rounded-md border bg-card px-3";

function Bags() {
  const { isStaff, isAdmin } = useRoles();
  const [genKind, setGenKind] = useState<"seal" | "plastic">("seal");
  const [genCount, setGenCount] = useState("50");
  const [genBusy, setGenBusy] = useState(false);
  const generate = async () => {
    const n = Number(genCount);
    if (!Number.isInteger(n) || n < 1 || n > 2000) { toast.error("Enter between 1 and 2000"); return; }
    setGenBusy(true);
    const r = await supabase.rpc("generate_seal_codes", { _kind: genKind, _count: n });
    if (r.error) { toast.error(r.error.message); setGenBusy(false); return; }
    const codes = (r.data ?? []).map((x) => x.code);
    downloadBlob(await buildCodeSheetPdf(codes, genKind === "seal" ? "SEAL TAG" : "PLASTIC BAG"), `getxpress-${genKind}-${codes[0]}-${codes.length}.pdf`);
    toast.success(`${codes.length} unique ${genKind === "seal" ? "seal" : "plastic-bag"} codes generated`);
    setGenBusy(false);
  };
  const printBag = async (b: (typeof bags)[number]) => {
    downloadBlob(await buildBagLabelPdf({ bag_code: b.bag_code, destination: b.destination, seal_no: b.seal_no, plastic_bag_code: b.plastic_bag_code, created_at: b.created_at, pieces: b.bag_items.map((i) => ({ piece_code: i.shipment_pieces?.piece_code ?? "" })) }), `${b.bag_code}-label.pdf`);
  };
  const qc = useQueryClient();
  const [tab, setTab] = useState("bags");
  const [destination, setDestination] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bagId, setBagId] = useState("");
  const [code, setCode] = useState("");
  const [seal, setSeal] = useState("");
  const [plastic, setPlastic] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [find, setFind] = useState("");

  const { data: bags = [], error } = useQuery({ queryKey: ["bags"], enabled: isStaff, queryFn: async () => { const r = await supabase.from("bags").select("*,bag_items(piece_id,shipment_pieces(piece_code))").order("created_at", { ascending: false }); if (r.error) throw r.error; return r.data; } });
  const { data: manifests = [] } = useQuery({ queryKey: ["manifests"], enabled: isStaff, queryFn: async () => { const r = await supabase.from("manifests").select("*").order("created_at", { ascending: false }); if (r.error) throw r.error; return r.data; } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["bags"] }); qc.invalidateQueries({ queryKey: ["manifests"] }); };
  const result = (err: { message: string } | null, msg = "Saved") => { if (err) toast.error(err.message); else { toast.success(msg); refresh(); } return !err; };

  const doLookup = async (c: string) => {
    setFind(c);
    const r = await supabase.rpc("scan_bag_code", { _code: c });
    if (r.error) { toast.error(r.error.message); return; }
    const l = r.data as unknown as Lookup;
    setLookup(l);
    if (!l.found) { toast.error(`No bag, seal or plastic bag found for ${c}`); return; }
    if (l.status === "open" && l.bag_id) { setBagId(l.bag_id); setTab("bags"); }
    if (l.status === "sealed" && !l.manifest_code && l.bag_id) { setSelected((s) => (s.includes(l.bag_id!) ? s : [...s, l.bag_id!])); setTab("manifests"); toast.success(`${l.bag_code} added to the next manifest`); }
  };
  const addPiece = async (c: string) => { if (await result((await supabase.rpc("add_piece_to_bag", { _bag_id: bagId, _code: c })).error, `${c} added`)) setCode(""); };
  const setPlasticCode = async (c: string) => { if (await result((await supabase.rpc("set_plastic_bag", { _bag_id: bagId, _code: c })).error, "Plastic bag linked")) setPlastic(""); };
  const sealBag = async (c: string) => { if (await result((await supabase.rpc("seal_bag", { _bag_id: bagId, _seal: c })).error, "Bag sealed — ready for manifest")) { setSelected((s) => [...s, bagId]); setBagId(""); setSeal(""); } };
  const current = bags.find((b) => b.id === bagId);

  return (
    <AppShell wide>
      <PageHeader title="Dispatch center" sub="Scan bag, seal and plastic-bag barcodes with the camera, add parcels and dispatch manifests." />
      {isAdmin && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <p className="mb-2 font-bold">Generate seal / plastic-bag codes in bulk</p>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Code type" value={genKind} onChange={(e) => setGenKind(e.target.value as "seal" | "plastic")} className="h-11 rounded-md border bg-card px-3"><option value="seal">Seal tags</option><option value="plastic">Plastic bags</option></select>
            <input aria-label="How many codes" inputMode="numeric" value={genCount} onChange={(e) => setGenCount(e.target.value.replace(/\D/g, ""))} className="h-11 w-28 rounded-md border bg-card px-3" />
            <Button onClick={generate} disabled={genBusy}>{genBusy ? "Generating…" : "Generate & download PDF"}</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Every code is unique and never reused. Print the sheet and stick the barcodes on seals or plastic bags.</p>
        </div>
      )}
      {!isStaff ? <p>Staff access required.</p> : <>
        <section className="mb-6 rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
          <p className="mb-2 font-bold">Scan any bag, seal or plastic-bag barcode</p>
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (find.trim()) doLookup(find.trim().toUpperCase()); }}>
            <input aria-label="Bag, seal or plastic bag code" value={find} onChange={(e) => setFind(e.target.value.toUpperCase())} placeholder="Type or scan code" className={inp} />
            <ScanButton label="Camera" className="h-11" onCode={doLookup} /><Button type="submit" className="h-11">Find</Button>
          </form>
          {lookup?.found && <p className="mt-3 text-sm">Matched <b>{lookup.matched}</b> → bag <b className="font-mono">{lookup.bag_code}</b> · {lookup.status}{lookup.seal_no && ` · seal ${lookup.seal_no}`}{lookup.plastic_bag_code && ` · plastic ${lookup.plastic_bag_code}`}{lookup.manifest_code ? ` · manifest ${lookup.manifest_code} (${lookup.manifest_status})` : ""}</p>}
        </section>
        <div className="mb-5 flex gap-2"><Button variant={tab === "bags" ? "default" : "outline"} onClick={() => setTab("bags")}>Bags</Button><Button variant={tab === "manifests" ? "default" : "outline"} onClick={() => setTab("manifests")}>Manifests {selected.length > 0 && `(${selected.length} ready)`}</Button><Button variant={tab === "routes" ? "default" : "outline"} onClick={() => setTab("routes")}>Routes</Button></div>
        {error && <p className="text-destructive">Unable to load bags.</p>}
        {tab === "routes" ? <HubRoutes /> : tab === "bags" ? <>
          <form className="mb-5 flex gap-3" onSubmit={async (e) => { e.preventDefault(); if (result((await supabase.rpc("create_bag", { _destination: destination })).error, "Bag created")) setDestination(""); }}>
            <input required aria-label="Bag destination" placeholder="Destination hub / city" value={destination} onChange={(e) => setDestination(e.target.value)} className={inp} /><Button type="submit">Create bag</Button>
          </form>
          {current && <section className="mb-6 rounded-lg border bg-card p-5">
            <h2 className="mb-4 font-bold">Managing <span className="font-mono">{current.bag_code}</span> · {current.bag_items.length} parcels {current.plastic_bag_code && `· plastic ${current.plastic_bag_code}`}</h2>
            <div className="space-y-3">
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addPiece(code); }}><input required aria-label="Parcel barcode" placeholder="1. Parcel print barcode" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inp} /><ScanButton label="Scan" className="h-11" onCode={addPiece} /><Button type="submit">Add</Button></form>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setPlasticCode(plastic); }}><input required minLength={3} aria-label="Plastic bag code" placeholder="2. Plastic bag barcode" value={plastic} onChange={(e) => setPlastic(e.target.value.toUpperCase())} className={inp} /><ScanButton label="Scan" className="h-11" onCode={setPlasticCode} /><Button type="submit">Link</Button></form>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); sealBag(seal); }}><input required minLength={3} aria-label="Seal number" placeholder="3. Seal barcode" value={seal} onChange={(e) => setSeal(e.target.value.toUpperCase())} className={inp} /><ScanButton label="Scan" className="h-11" onCode={sealBag} /><Button type="submit">Seal bag</Button></form>
            </div>
          </section>}
          <div className="overflow-x-auto rounded-lg border bg-card"><table className="enterprise-table"><thead><tr><th>Bag</th><th>Destination</th><th>Status / Seal / Plastic</th><th>Parcels</th><th /></tr></thead><tbody>
            {bags.map((b) => <tr key={b.id}><td className="font-mono font-bold">{b.bag_code}</td><td>{b.destination}</td><td className="capitalize">{b.status}<p className="text-xs normal-case">{b.seal_no}{b.plastic_bag_code && ` · ${b.plastic_bag_code}`}</p></td><td>{b.bag_items.length}<p className="max-w-56 break-words text-xs text-muted-foreground">{b.bag_items.map((p) => p.shipment_pieces?.piece_code).join(", ")}</p></td><td>{b.status === "open" && <Button variant="outline" onClick={() => { setBagId(b.id); setSeal(""); }}>Manage</Button>}<Button variant="ghost" onClick={() => printBag(b)}>Print label</Button></td></tr>)}
          </tbody></table>{!bags.length && <p className="p-8 text-center text-muted-foreground">No bags in your scope.</p>}</div>
        </> : <>
          <form className="mb-6 border-y py-5" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const ok = await supabase.rpc("route_connected", { _from: String(f.get("from")), _to: String(f.get("to")) }); if (ok.data === false) { toast.error("These locations are not connected. Add the route in Routes first."); return; } if (result((await supabase.rpc("create_manifest", { _from: String(f.get("from")), _to: String(f.get("to")), _vehicle: String(f.get("vehicle")), _bag_ids: selected })).error, "Manifest dispatched")) setSelected([]); }}>
            <div className="grid gap-3 sm:grid-cols-3">{["from", "to", "vehicle"].map((k) => <input key={k} required name={k} aria-label={`Manifest ${k}`} placeholder={k === "vehicle" ? "Vehicle / transport number" : `${k} hub`} className="h-11 rounded-md border bg-card px-3" />)}</div>
            <div className="my-4 flex flex-wrap gap-4">{bags.filter((b) => b.status === "sealed" && !b.manifest_id).map((b) => <label key={b.id} className="flex gap-2 text-sm"><input type="checkbox" checked={selected.includes(b.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, b.id] : selected.filter((x) => x !== b.id))} />{b.bag_code}</label>)}</div>
            <Button type="submit" disabled={!selected.length}>Dispatch manifest</Button>
          </form>
          <div className="overflow-x-auto rounded-lg border bg-card"><table className="enterprise-table"><thead><tr><th>Manifest</th><th>Route</th><th>Vehicle</th><th>Status</th><th /></tr></thead><tbody>
            {manifests.map((m) => <tr key={m.id}><td className="font-mono font-bold">{m.manifest_code}</td><td>{m.from_location} → {m.to_location}</td><td>{m.vehicle_no}</td><td>{m.status}</td><td>{m.status !== "received" && <Button variant="outline" onClick={async () => result((await supabase.rpc("receive_manifest", { _manifest_id: m.id })).error, "Manifest received")}>Receive</Button>}<Button variant="ghost" onClick={() => { const related = bags.filter((b) => b.manifest_id === m.id); const text = [`Get Xpress · ${m.manifest_code}`, `${m.from_location} → ${m.to_location}`, `Vehicle: ${m.vehicle_no}`, "Bag,Seal,Plastic,Parcels", ...related.map((b) => `${b.bag_code},${b.seal_no ?? ""},${b.plastic_bag_code ?? ""},${b.bag_items.length}`)].join("\n"); const a = document.createElement("a"), url = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.href = url; a.download = `${m.manifest_code}.csv`; a.click(); URL.revokeObjectURL(url); }}>Export</Button></td></tr>)}
          </tbody></table>{!manifests.length && <p className="p-8 text-center text-muted-foreground">No manifests.</p>}</div>
        </>}
      </>}
    </AppShell>
  );
}
