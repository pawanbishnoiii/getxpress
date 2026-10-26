import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Boxes, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";

/** After a hub/staff booking: put every parcel of the order into an open bag for its destination, or a new one. */
export function HubBagPrompt({ shipmentId }: { shipmentId: string }) {
  const { isStaff } = useRoles();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false), [doneBag, setDoneBag] = useState("");
  const { data } = useQuery({
    queryKey: ["bag-prompt", shipmentId], enabled: isStaff,
    queryFn: async () => {
      const { data: s } = await supabase.from("shipments").select("receiver_city,receiver_pincode,shipment_pieces(piece_code)").eq("id", shipmentId).maybeSingle();
      if (!s) return null;
      const { data: bags } = await supabase.from("bags").select("id,bag_code,destination,bag_items(id)").eq("status", "open").ilike("destination", `%${s.receiver_city}%`).order("created_at", { ascending: false }).limit(10);
      return { dest: s.receiver_city, pieces: (s.shipment_pieces ?? []).map((p) => p.piece_code), bags: bags ?? [] };
    },
  });
  if (!isStaff || !data) return null;
  const fill = async (bagId: string, code: string) => {
    setBusy(true);
    for (const pc of data.pieces) { const r = await supabase.rpc("add_piece_to_bag", { _bag_id: bagId, _code: pc }); if (r.error) { toast.error(`${pc}: ${r.error.message}`); setBusy(false); return; } }
    setBusy(false); setDoneBag(code); qc.invalidateQueries({ queryKey: ["bags"] }); toast.success(`${data.pieces.length} parcel(s) added to ${code}`);
  };
  const newBag = async () => {
    const r = await supabase.rpc("create_bag", { _destination: data.dest });
    if (r.error) { toast.error(r.error.message); return; }
    const b = r.data as { id: string; bag_code: string }; await fill(b.id, b.bag_code);
  };
  if (doneBag) return <p className="mt-4 rounded-xl border bg-primary/5 p-3 text-center text-sm">Parcels are in bag <b className="font-mono">{doneBag}</b>. Seal it and add the plastic-bag code in Dispatch center.</p>;
  return <section className="mt-4 rounded-2xl border bg-card p-4">
    <p className="flex items-center gap-2 font-bold"><Boxes className="h-5 w-5 text-primary" />Put this order in a bag for {data.dest}?</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {data.bags.map((b) => <Button key={b.id} variant="outline" disabled={busy} onClick={() => fill(b.id, b.bag_code)}>{b.bag_code} · {b.bag_items.length} inside</Button>)}
      <Button disabled={busy} onClick={newBag}><PackagePlus />New bag for {data.dest}</Button>
    </div>
    {!data.bags.length && <p className="mt-2 text-xs text-muted-foreground">No open bag for this destination yet.</p>}
  </section>;
}
