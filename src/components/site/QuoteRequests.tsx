import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRoles } from '@/hooks/use-roles';
import { Button } from '@/components/ui/button';
import { updateQuoteStatus } from '@/lib/international.functions';
import { BOOKABLE, QUOTE_STATUSES } from '@/lib/intl-status';

type Row = { id: string; reference: string; status: string; created_at: string; receiver: unknown; weight_kg: number; booking: unknown; service_name: string | null; quoted_price: number | null; carrier_awb: string | null };

/** International quotes: customers book and track; staff move each one along the tracking timeline. */
export function QuoteRequests() {
  const { isStaff } = useRoles();
  const { data = [], error } = useQuery({ queryKey: ['international-quote-requests'], queryFn: async () => { const r = await supabase.from('international_quote_requests').select('id,reference,status,created_at,receiver,weight_kg,booking,service_name,quoted_price,carrier_awb').order('created_at', { ascending: false }).limit(50); if (r.error) throw r.error; return r.data as Row[]; } });
  return <section className="mt-10 border-t pt-6"><h2 className="text-xl font-bold">International quotes & bookings</h2>
    {error ? <p className="mt-3 text-sm text-destructive">Requests could not load. Please retry.</p> : <div className="mt-4 overflow-x-auto"><table className="enterprise-table"><thead><tr><th>Reference</th><th>Destination</th><th>Weight</th><th>Status</th><th>Pickup</th><th /></tr></thead><tbody>
      {data.map((r) => { const rc = r.receiver as { country?: string; city?: string }; const b = r.booking as { pickup_date?: string; pickup_slot?: string; payment?: string } | null;
        return <tr key={r.id}><td className="font-mono font-bold">{r.reference}</td><td>{rc.city}, {rc.country}</td><td>{r.weight_kg} kg</td><td className="capitalize">{r.status.replaceAll('_', ' ')}{r.quoted_price != null && <span className="block text-xs text-muted-foreground">₹{Number(r.quoted_price).toLocaleString('en-IN')}</span>}</td><td className="text-xs">{b?.pickup_date ? `${b.pickup_date} · ${b.pickup_slot}` : '—'}{b?.payment && <span className="block capitalize text-muted-foreground">{b.payment.replaceAll('_', ' ')}</span>}</td>
          <td className="whitespace-nowrap">{isStaff ? <StaffStatus row={r} /> : <div className="flex gap-2">{BOOKABLE.includes(r.status) && <Button asChild size="sm"><Link to="/international/book" search={{ ref: r.reference }}>Book</Link></Button>}<Button asChild size="sm" variant="outline"><Link to="/track" search={{ id: r.reference }}>Track</Link></Button></div>}</td></tr>; })}
    </tbody></table>{!data.length && <p className="mt-3 text-sm text-muted-foreground">No quote requests yet. <Link to="/international" className="font-semibold text-primary">Request one</Link></p>}</div>}
  </section>;
}

function StaffStatus({ row }: { row: Row }) {
  const qc = useQueryClient(); const save = useServerFn(updateQuoteStatus);
  const [status, setStatus] = useState(row.status), [note, setNote] = useState(''), [price, setPrice] = useState(row.quoted_price == null ? '' : String(row.quoted_price)), [awb, setAwb] = useState(row.carrier_awb ?? ''), [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await save({ data: { id: row.id, status: status as (typeof QUOTE_STATUSES)[number], note, price: price ? Number(price) : null, awb } }); toast.success(`${row.reference} → ${status.replaceAll('_', ' ')}`); setNote(''); qc.invalidateQueries({ queryKey: ['international-quote-requests'] }); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const f = 'h-8 rounded-md border bg-background px-2 text-xs';
  return <div className="flex flex-wrap items-center gap-1.5">
    <select aria-label={`Status for ${row.reference}`} value={status} onChange={(e) => setStatus(e.target.value)} className={f}>{QUOTE_STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</select>
    <input aria-label="Price ₹" placeholder="Price ₹" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} className={`${f} w-20`} />
    <input aria-label="Partner AWB" placeholder="Partner AWB" value={awb} onChange={(e) => setAwb(e.target.value)} className={`${f} w-28`} />
    <input aria-label="Note" placeholder="Note for customer" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className={`${f} w-36`} />
    <Button size="sm" className="h-8" disabled={busy} onClick={go}>Update</Button>
  </div>;
}
