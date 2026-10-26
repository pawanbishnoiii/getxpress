import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { ArrowRight, Check, Copy, Globe2, Loader2, MapPin, PackageSearch, Plane, RefreshCw, Truck } from 'lucide-react';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrackAssistant } from '@/components/site/TrackAssistant';
import { QUOTE_STEPS, quoteStepIndex, isQuoteRef } from '@/lib/intl-status';

export const Route = createFileRoute('/track')({
  validateSearch: (s) => z.object({ id: z.coerce.string().max(30).optional() }).parse(s),
  head: () => ({ meta: [{ title: 'Track a parcel — GetXpress' }, { name: 'description', content: 'Check GetXpress AWB, parcel IDs and international quote references with every recorded status update.' }, { property: 'og:title', content: 'GetXpress parcel tracking' }, { property: 'og:description', content: 'Shipment progress, parcel identifiers and scan history in one place.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: Track,
});

type Raw = { tracking_number: string; status: string; service: string; from_city: string; to_city: string; created_at: string; updated_at?: string; pieces_count?: number;
  pieces: { piece_code?: string; code?: string; seq_no?: number; seq?: number }[]; events: { status: string; location: string | null; note: string | null; created_at?: string; at?: string; piece?: string | null }[] } | null;
type Quote = { reference: string; status: string; created_at: string; updated_at?: string; from_country: string; from_city?: string; to_country: string; to_city: string; weight_kg: number; service_name?: string | null; booked_at?: string | null; carrier_awb?: string | null; history?: { status: string; note: string | null; at: string }[] } | null;

const milestones = [{ label: 'Booked', states: ['booked', 'awaiting_payment'] }, { label: 'Picked up', states: ['picked_up', 'pickup_completed'] }, { label: 'In transit', states: ['dispatched', 'in_transit', 'at_hub', 'bagged', 'reached_hub'] }, { label: 'Out for delivery', states: ['out_for_delivery'] }, { label: 'Delivered', states: ['delivered'] }];
const words = (s: string) => s.replaceAll('_', ' ');

function Track() {
  const { id } = Route.useSearch(), navigate = useNavigate();
  const [value, setValue] = useState(id ?? '');
  useEffect(() => setValue(id ?? ''), [id]);
  const isQuote = isQuoteRef(id ?? '');
  const { data, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['track', id], enabled: Boolean(id) && !isQuote, retry: 1,
    refetchInterval: (q) => q.state.data && !['delivered', 'cancelled', 'returned'].includes((q.state.data as NonNullable<Raw>).status) ? 15000 : false,
    queryFn: async () => { const r = await supabase.rpc('track_shipment', { _tracking: id ?? '' }); if (r.error) throw new Error('Tracking is temporarily unavailable. Please retry.'); return (r.data ?? null) as Raw; },
  });
  const quote = useQuery({ queryKey: ['track-quote', id], enabled: isQuote, refetchInterval: 20000,
    queryFn: async () => { const r = await supabase.rpc('track_quote', { _ref: id ?? '' }); if (r.error) throw new Error('Tracking is temporarily unavailable.'); return (r.data ?? null) as unknown as Quote; } });
  const step = data ? milestones.findIndex((m) => m.states.includes(data.status)) : -1;
  const pieces = (data?.pieces ?? []).map((p, i, all) => ({ code: p.piece_code ?? p.code ?? '', seq: Number(p.seq_no ?? p.seq ?? i + 1), total: all.length }));
  const events = [...(data?.events ?? [])].map((e) => ({ ...e, at: e.created_at ?? e.at ?? '' })).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const copy = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/track?id=${encodeURIComponent(data?.tracking_number ?? id ?? '')}`); toast.success('Tracking link copied'); } catch { toast.error('Could not copy. Share the address from your browser.'); } };
  return <div className="min-h-screen bg-background"><SiteNav /><main className="mx-auto max-w-5xl px-5 pb-20 pt-32">
    <p className="flex items-center gap-2 text-xs font-bold uppercase text-primary"><PackageSearch className="h-4 w-4" />GetXpress tracking</p>
    <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">Follow your parcel.</h1>
    <p className="mt-4 text-muted-foreground">AWB, parcel ID or international quote reference (GXI…).</p>
    <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) navigate({ to: '/track', search: { id: value.trim().toUpperCase() } }); }} className="mt-8 flex max-w-2xl gap-2"><input aria-label="Tracking number" required maxLength={30} value={value} onChange={(e) => setValue(e.target.value)} placeholder="AWB, parcel ID or GXI reference" className="h-12 min-w-0 flex-1 rounded-md border bg-card px-4 font-mono" /><Button type="submit" className="h-12">Track<ArrowRight /></Button></form>

    {isQuote && <section className="mt-10 rounded-2xl border bg-card p-6">{quote.isLoading ? <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" />Checking request…</p> : quote.data ? <QuoteView q={quote.data} /> : <p role="alert">No international request found for this reference.</p>}</section>}

    {!isQuote && isFetching && !data && <div className="flex items-center gap-3 py-12 text-muted-foreground"><Loader2 className="animate-spin" />Checking shipment…</div>}
    {error && <div role="alert" className="mt-8 border-l-2 border-destructive pl-4"><p>{(error as Error).message}</p><Button variant="outline" onClick={() => refetch()} className="mt-4"><RefreshCw />Retry</Button></div>}
    {!isQuote && !isFetching && !error && id && data === null && <div className="py-12"><PackageSearch className="h-10 w-10 text-muted-foreground" /><h2 className="mt-4 text-xl font-bold">No shipment found</h2><p className="mt-2 text-sm text-muted-foreground">Check {id}. Use the AWB or parcel ID from your booking confirmation.</p></div>}
    {data && <div className="mt-10">
      <div className="flex flex-wrap items-start justify-between gap-5 border-t pt-6"><div><p className="font-mono text-sm text-muted-foreground">{data.tracking_number}</p><h2 className="mt-2 text-2xl font-bold">{data.from_city}<span className="mx-3 text-primary">→</span>{data.to_city}</h2><p className="mt-2 text-sm capitalize text-muted-foreground">{words(data.service)} · Booked {new Date(data.created_at).toLocaleDateString('en-IN')}</p></div>
        <div className="flex items-center gap-2"><span className="rounded-md bg-primary/10 px-3 py-2 text-sm font-bold capitalize text-primary">{words(data.status)}</span><Button title="Copy tracking link" aria-label="Copy tracking link" variant="outline" size="icon" onClick={copy}><Copy /></Button><Button title="Refresh tracking" aria-label="Refresh tracking" variant="outline" size="icon" disabled={isFetching} onClick={() => refetch()}><RefreshCw className={isFetching ? 'animate-spin' : ''} /></Button></div></div>
      <ol className="my-8 grid grid-cols-5 gap-2">{milestones.map((m, i) => <li key={m.label} className={`border-t-2 pt-3 ${step >= i ? 'border-primary text-primary' : 'text-muted-foreground'}`}><span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full border">{step >= i ? <Check className="h-4 w-4" /> : <span className="text-xs">{i + 1}</span>}</span><span className="text-[11px] font-bold sm:text-sm">{m.label}</span></li>)}</ol>
      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <section className="border-t pt-5"><h3 className="text-xl font-bold">Scan history</h3>{events.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">No handover scans recorded yet.</p> : <ol className="mt-6 space-y-6">{events.map((e, i) => <li key={`${e.at}-${i}`} className="flex gap-4"><span className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-primary'}`}><Truck className="h-4 w-4" /></span><div><p className="font-semibold capitalize">{words(e.status)}</p>{e.location && <p className="mt-1 flex items-center gap-1 text-sm"><MapPin className="h-3 w-3" />{e.location}</p>}{e.note && <p className="mt-1 text-sm text-muted-foreground">{e.note}</p>}{e.at && <time className="mt-2 block text-xs text-muted-foreground">{new Date(e.at).toLocaleString('en-IN')}</time>}</div></li>)}</ol>}</section>
        <section className="border-t pt-5"><h3 className="text-xl font-bold">Parcels</h3><div className="mt-4 space-y-3">{pieces.map((p) => <div key={p.code} className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">Parcel {p.seq} of {p.total}</p><p className="mt-1 break-all font-mono text-sm font-bold">{p.code}</p></div>)}</div><p className="mt-5 text-xs text-muted-foreground">Last checked {new Date(dataUpdatedAt).toLocaleTimeString('en-IN')}. Updates every 15 seconds; status reflects recorded scans, not live GPS.</p></section>
      </div></div>}
    <div className="max-w-2xl"><TrackAssistant key={id ?? ''} tracking={id && !isQuote ? id : ''} /></div>
  </main><SiteFooter /></div>;
}

function QuoteView({ q }: { q: NonNullable<Quote> }) {
  const at = quoteStepIndex(q.status);
  const history = [...(q.history ?? [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return <div>
    <p className="flex items-center gap-2 text-xs font-bold uppercase text-primary"><Globe2 className="h-4 w-4" />International shipment</p>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><p className="font-mono text-2xl font-bold">{q.reference}</p><span className="rounded-md bg-primary/10 px-3 py-2 text-sm font-bold capitalize text-primary">{words(q.status)}</span></div>
    <div className="mt-5 grid gap-4 text-sm sm:grid-cols-4"><div><p className="text-muted-foreground">Route</p><p className="font-semibold">{q.from_city ? `${q.from_city}, ` : ''}{q.from_country} → {q.to_city ? `${q.to_city}, ` : ''}{q.to_country}</p></div><div><p className="text-muted-foreground">Service</p><p className="font-semibold">{q.service_name || 'To be confirmed'}</p></div><div><p className="text-muted-foreground">Weight</p><p className="font-semibold">{q.weight_kg} kg</p></div><div><p className="text-muted-foreground">Partner AWB</p><p className="font-mono font-semibold">{q.carrier_awb || '—'}</p></div></div>
    <ol className="mt-6 grid grid-cols-3 gap-2 text-[11px] sm:grid-cols-6 sm:text-xs">{QUOTE_STEPS.map((s, i) => <li key={s.label} className={`rounded-lg border p-2 font-semibold ${i <= at ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground'}`}><span className="flex items-center gap-1">{i <= at ? <Check className="h-3 w-3" /> : <Plane className="h-3 w-3" />}{s.label}</span></li>)}</ol>
    {q.status === 'cancelled' && <p className="mt-4 text-sm font-semibold text-destructive">This request was cancelled.</p>}
    <h3 className="mt-6 font-bold">Status updates</h3>
    {history.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Request received {new Date(q.created_at).toLocaleString('en-IN')}. Our team reviews customs and partner availability next.</p>
      : <ol className="mt-3 space-y-4">{history.map((h, i) => <li key={`${h.at}-${i}`} className="flex gap-3"><span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-primary'}`}><Plane className="h-3.5 w-3.5" /></span><div><p className="font-semibold capitalize">{words(h.status)}</p>{h.note && <p className="text-sm text-muted-foreground">{h.note}</p>}<time className="text-xs text-muted-foreground">{new Date(h.at).toLocaleString('en-IN')}</time></div></li>)}</ol>}
    {['pending', 'new', 'reviewing', 'quoted'].includes(q.status) && <Button asChild className="mt-6"><Link to="/international/book" search={{ ref: q.reference }}>Fill booking form<ArrowRight /></Link></Button>}
  </div>;
}
