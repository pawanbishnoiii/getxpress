import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { z } from 'zod';

const price = z.object({ label: z.string().trim().min(2).max(60), fee: z.number().min(0).max(100000), max_kg: z.number().min(0).max(100), l: z.number().min(0).max(300), w: z.number().min(0).max(300), h: z.number().min(0).max(300) });
const NUM = ['fee', 'max_kg', 'l', 'w', 'h'] as const;
const LABELS: Record<(typeof NUM)[number], string> = { fee: 'Extra charge (₹)', max_kg: 'Maximum kg', l: 'Length cm', w: 'Width cm', h: 'Height cm' };

/** Admin editor for parcel sizes and add-on fees; bookings read the same rows, so saved fees apply to the next price. */
export function ParcelPrices() {
  const qc = useQueryClient();
  const { data: rows = [], error } = useQuery({ queryKey: ['admin-parcel-prices'], queryFn: async () => { const r = await supabase.from('parcel_presets').select('*').order('sort'); if (r.error) throw r.error; return r.data; } });
  const [adding, setAdding] = useState(false);
  const refresh = async () => { await qc.invalidateQueries({ queryKey: ['admin-parcel-prices'] }); await qc.invalidateQueries({ queryKey: ['parcel-presets'] }); };
  const read = (f: FormData) => price.safeParse({ label: String(f.get('label') ?? ''), ...Object.fromEntries(NUM.map((k) => [k, Number(f.get(k) ?? 0)])) });
  return <section className="mt-8 border-t pt-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold">Parcel sizes & handling prices</h2><p className="mt-2 text-sm text-muted-foreground">Saved fees are added to every new booking price. Handling fees never permit prohibited batteries or dangerous goods.</p></div><Button variant="outline" onClick={() => setAdding((a) => !a)}><Plus />Add size</Button></div>
    {error && <p className="mt-4 text-destructive">Prices could not load.</p>}
    {adding && <form className="mt-5 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-4" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget); const p = read(f);
      const code = String(f.get('code') ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!p.success || code.length < 2) { toast.error('Enter a name, a short code and valid numbers'); return; }
      const kind = String(f.get('kind'));
      const r = await supabase.from('parcel_presets').insert({ ...p.data, code, kind, sort: rows.length + 1, active: true });
      if (r.error) { toast.error(r.error.code === '23505' ? 'That code already exists' : 'Size could not be added'); return; }
      toast.success('Parcel size added'); setAdding(false); await refresh();
    }}>
      <label className="text-xs">Name<input name="label" required className="mt-1 h-10 w-full rounded-md border bg-background px-2" placeholder="Jumbo box" /></label>
      <label className="text-xs">Short code<input name="code" required className="mt-1 h-10 w-full rounded-md border bg-background px-2 font-mono" placeholder="jumbo" /></label>
      <label className="text-xs">Type<select name="kind" className="mt-1 h-10 w-full rounded-md border bg-background px-2"><option value="packages">Box / package</option><option value="documents">Document</option><option value="addon">Add-on charge</option></select></label>
      {NUM.map((k) => <label key={k} className="text-xs">{LABELS[k]}<input name={k} type="number" min="0" step="0.01" defaultValue={0} className="mt-1 h-10 w-full rounded-md border bg-background px-2" /></label>)}
      <div className="flex items-end"><Button type="submit">Save new size</Button></div>
    </form>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map((r) => <form key={`${r.id}-${r.updated_at}`} className="rounded-lg border bg-card p-4" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget); const p = read(f);
      if (!p.success) { toast.error('Enter valid prices and size limits'); return; }
      const result = await supabase.from('parcel_presets').update({ ...p.data, active: f.get('active') === 'on', updated_at: new Date().toISOString() }).eq('id', r.id);
      if (result.error) { toast.error('Price could not be saved'); return; }
      toast.success(`${p.data.label} saved — new bookings use ₹${p.data.fee}`); await refresh();
    }}>
      <div className="flex items-center justify-between gap-2"><input name="label" defaultValue={r.label} aria-label="Size name" className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 font-bold" /><span className="rounded bg-muted px-2 py-1 font-mono text-[10px]">{r.code ?? '—'} · {r.kind}</span></div>
      <div className="mt-4 grid grid-cols-2 gap-3">{NUM.filter((k) => k === 'fee' || r.kind !== 'addon').map((k) => <label key={k} className="text-xs">{LABELS[k]}<input name={k} type="number" min="0" step="0.01" defaultValue={Number(r[k])} className="mt-1 h-10 w-full rounded-md border bg-background px-2" /></label>)}</div>
      <label className="my-4 flex gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={r.active} />Enabled</label><Button type="submit" size="sm">Save</Button>
    </form>)}</div>
    {!error && rows.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No sizes saved yet — bookings use the standard sizes.</p>}
  </section>;
}
