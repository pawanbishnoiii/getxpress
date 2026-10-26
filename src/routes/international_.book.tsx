import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileBadge, Hash, Home, Loader2, MessageSquare, Package, Phone, Plane, Wallet, Zap } from 'lucide-react';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/use-session';
import { bookInternationalQuote, intlBookingSchema } from '@/lib/international.functions';
import { BOOKABLE } from '@/lib/intl-status';

export const Route = createFileRoute('/international_/book')({
  validateSearch: (s) => z.object({ ref: z.string().max(30).optional() }).parse(s),
  head: () => ({ meta: [{ title: 'Book your international shipment — GetXpress' }, { name: 'description', content: 'Turn your GetXpress quote reference into a pickup booking: date, time slot, service and payment preference.' }, { property: 'og:title', content: 'Book an international shipment — GetXpress' }, { property: 'og:description', content: 'Enter your quote reference and schedule pickup for your international parcel.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: BookIntl,
});

const box = 'mt-1 flex h-11 items-center gap-2 rounded-md border bg-card px-3 focus-within:ring-2 focus-within:ring-ring';
const inp = 'h-full min-w-0 flex-1 bg-transparent text-sm font-normal outline-none';
const ic = 'h-4 w-4 shrink-0 text-primary';
const tomorrow = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);

function BookIntl() {
  const { ref } = Route.useSearch();
  const { user, loading } = useSession();
  const book = useServerFn(bookInternationalQuote);
  const [f, setF] = useState({ reference: ref ?? '', service: 'as_quoted' as 'cheapest' | 'fastest' | 'as_quoted', pickup_date: tomorrow(), pickup_slot: 'morning' as 'morning' | 'afternoon' | 'evening', pickup_address: '', pickup_contact: '', payment: 'pay_at_pickup' as 'pay_at_pickup' | 'upi_after_price' | 'wallet', kyc_document: 'aadhaar' as 'aadhaar' | 'pan' | 'passport', packaging_help: false, notes: '', agree: false });
  const [busy, setBusy] = useState(false), [done, setDone] = useState('');
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const refCode = f.reference.trim().toUpperCase();
  const { data: quote, isFetching } = useQuery({
    queryKey: ['my-quote', refCode], enabled: !!user && refCode.length >= 8,
    queryFn: async () => (await supabase.from('international_quote_requests').select('id,reference,status,sender,receiver,weight_kg,contents').ilike('reference', refCode).maybeSingle()).data,
  });
  useEffect(() => {
    if (!quote) return;
    const s = quote.sender as { address?: string; city?: string; postal_code?: string; phone?: string };
    setF((x) => ({ ...x, pickup_address: x.pickup_address || [s.address, s.city, s.postal_code].filter(Boolean).join(', '), pickup_contact: x.pickup_contact || (s.phone ?? '') }));
  }, [quote?.id]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = intlBookingSchema.safeParse({ ...f, reference: refCode });
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? 'Check the booking details'); return; }
    setBusy(true);
    try { const r = await book({ data: p.data }); setDone(r.reference); toast.success('Booking request sent'); } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  const receiver = quote?.receiver as { city?: string; country?: string; name?: string } | undefined;
  const choice = (on: boolean) => `flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold transition ${on ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'bg-card hover:border-primary/50'}`;
  return <div className="min-h-screen bg-background"><SiteNav /><main className="mx-auto max-w-4xl px-5 pb-16 pt-32">
    <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Plane className="h-4 w-4" />International booking</p>
    <h1 className="mt-3 text-4xl font-extrabold">Book with your quote reference</h1>
    <p className="mt-3 text-muted-foreground">Choose a pickup date and slot. Our team confirms the final price after checking customs, then the status updates on the tracking page.</p>
    {!loading && !user ? <div className="mt-8 rounded-2xl border bg-card p-6"><p className="font-semibold">Sign in with the account you used for the quote.</p><Button asChild className="mt-4"><Link to="/auth" search={{ redirect: `/international/book${ref ? `?ref=${ref}` : ''}` }}>Sign in<ArrowRight /></Link></Button></div>
      : done ? <div className="mt-8 rounded-2xl border bg-card p-8"><CheckCircle2 className="h-12 w-12 text-primary" /><h2 className="mt-4 text-2xl font-bold">Booking request sent</h2><p className="mt-2 font-mono text-xl">{done}</p><p className="mt-2 text-muted-foreground">We'll call or WhatsApp you to confirm the price and pickup. Follow every update on the tracking page.</p><div className="mt-5 flex flex-wrap gap-3"><Button asChild><Link to="/track" search={{ id: done }}>Track status<ArrowRight /></Link></Button><Button asChild variant="outline"><Link to="/users/dashboard">My dashboard</Link></Button></div></div>
      : <form onSubmit={submit} className="mt-8 space-y-6">
        <section className="rounded-2xl border bg-card p-5">
          <label className="text-xs font-semibold">Quote reference<div className={box}><Hash className={ic} /><input aria-label="Quote reference" required value={f.reference} onChange={(e) => set({ reference: e.target.value.toUpperCase() })} placeholder="GXI1A2B3C4D" className={`${inp} font-mono`} />{isFetching && <Loader2 className="h-4 w-4 animate-spin" />}</div></label>
          {quote ? <div className="mt-3 grid gap-2 rounded-xl bg-muted/50 p-3 text-sm sm:grid-cols-4"><span><b>To:</b> {receiver?.name}, {receiver?.city}, {receiver?.country}</span><span><b>Weight:</b> {quote.weight_kg} kg</span><span><b>Items:</b> {quote.contents}</span><span className="capitalize"><b>Status:</b> {quote.status.replaceAll('_', ' ')}</span></div>
            : refCode.length >= 8 && !isFetching && <p className="mt-2 text-sm text-destructive">No quote with this reference on your account.</p>}
          {quote && !BOOKABLE.includes(quote.status) && <p className="mt-2 text-sm font-semibold text-primary">This reference is already {quote.status.replaceAll('_', ' ')}. <Link to="/track" search={{ id: quote.reference }} className="underline">See tracking</Link></p>}
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold">Service</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">{([['as_quoted', 'As quoted', Package], ['cheapest', 'Lowest price', Wallet], ['fastest', 'Fastest delivery', Zap]] as const).map(([v, l, I]) => <button type="button" key={v} onClick={() => set({ service: v })} className={choice(f.service === v)}><I className={ic} />{l}</button>)}</div>
        </section>
        <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Pickup</h2>
          <label className="text-xs font-semibold">Pickup date<div className={box}><CalendarDays className={ic} /><input aria-label="Pickup date" type="date" required min={tomorrow()} value={f.pickup_date} onChange={(e) => set({ pickup_date: e.target.value })} className={inp} /></div></label>
          <label className="text-xs font-semibold">Time slot<div className={box}><Clock3 className={ic} /><select aria-label="Time slot" value={f.pickup_slot} onChange={(e) => set({ pickup_slot: e.target.value as 'morning' })} className={inp}><option value="morning">Morning · 9am–12pm</option><option value="afternoon">Afternoon · 12–4pm</option><option value="evening">Evening · 4–8pm</option></select></div></label>
          <label className="text-xs font-semibold sm:col-span-2">Pickup address<div className={box}><Home className={ic} /><input aria-label="Pickup address" required maxLength={400} value={f.pickup_address} onChange={(e) => set({ pickup_address: e.target.value })} placeholder="House, street, area, city, PIN" className={inp} /></div></label>
          <label className="text-xs font-semibold">Pickup mobile<div className={box}><Phone className={ic} /><input aria-label="Pickup mobile" type="tel" required value={f.pickup_contact} onChange={(e) => set({ pickup_contact: e.target.value.replace(/[^\d+]/g, '') })} placeholder="+919876543210" className={inp} /></div></label>
          <label className="text-xs font-semibold">ID for customs (KYC)<div className={box}><FileBadge className={ic} /><select aria-label="KYC document" value={f.kyc_document} onChange={(e) => set({ kyc_document: e.target.value as 'pan' })} className={inp}><option value="aadhaar">Aadhaar card</option><option value="pan">PAN card</option><option value="passport">Passport</option></select></div></label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.packaging_help} onChange={(e) => set({ packaging_help: e.target.checked })} />I need packing help at pickup</label>
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold">Payment</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">{([['pay_at_pickup', 'Pay at pickup'], ['upi_after_price', 'UPI after final price'], ['wallet', 'GetXpress wallet']] as const).map(([v, l]) => <button type="button" key={v} onClick={() => set({ payment: v })} className={choice(f.payment === v)}><Wallet className={ic} />{l}</button>)}</div>
          <label className="mt-4 block text-xs font-semibold">Notes for our team<div className={box}><MessageSquare className={ic} /><input aria-label="Notes" maxLength={500} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Gate code, best time to call…" className={inp} /></div></label>
        </section>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={f.agree} onChange={(e) => set({ agree: e.target.checked })} className="mt-1" /><span>I understand the final price is confirmed after weight and customs checks, and the parcel has no prohibited items.</span></label>
        <Button type="submit" size="lg" disabled={busy || !quote || !BOOKABLE.includes(quote.status)}>{busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}Send booking request</Button>
      </form>}
  </main><SiteFooter /></div>;
}
