import { RegionFields } from '@/components/site/RegionFields';
import { PinAutocomplete } from '@/components/site/PinAutocomplete';
import { postalLookup } from '@/lib/postal';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck } from 'lucide-react';
import { AppShell, PageHeader } from '@/components/site/AppShell';
import { PhoneVerify } from '@/components/site/PhoneVerify';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/use-profile';
import { contactSchema } from '@/lib/contact-schema';
import { saveContactDetails, finishOnboarding } from '@/lib/onboarding.functions';
import { INDIAN_STATES, isSyntheticEmail } from '@/lib/india-regions';

export const Route = createFileRoute('/_authenticated/onboarding')({
  head: () => ({ meta: [
    { title: 'Your profile — GetXpress' },
    { name: 'description', content: 'Set up your GetXpress customer profile in under a minute.' },
    { property: 'og:title', content: 'Your GetXpress profile' },
    { property: 'og:description', content: 'Personal details, state and district for your GetXpress account.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Onboarding,
});

function friendly(e: unknown) { const m = (e as Error)?.message ?? ''; if (m.trim().startsWith('[')) { try { const i = JSON.parse(m) as { path?: string[] }[]; return `Please fill ${i.map((x) => x.path?.[0]).filter(Boolean).join(', ')}`; } catch { /* fallthrough */ } } return m || 'Something went wrong'; }

function Onboarding() {
  const { data } = useProfile(); const p = data?.profile as (NonNullable<typeof data>['profile'] & { state?: string | null; district?: string | null }) | undefined;
  const qc = useQueryClient(); const navigate = useNavigate();
  const saveDetails = useServerFn(saveContactDetails); const finish = useServerFn(finishOnboarding);
  const [step, setStep] = useState(1); const [pinBusy, setPinBusy] = useState(false); const [areas, setAreas] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [number, setNumber] = useState('');
  const [f, setF] = useState({ first_name: '', last_name: '', age: '', gender: '', contact_email: '', phone: '', whatsapp: '', state: '', district: '', city: '', pincode: '' });
  const verified = Boolean(p?.phone_verified && p?.phone);
  useEffect(() => {
    if (!p) return;
    const authEmail = data?.user.email ?? '';
    setF({
      first_name: p.first_name ?? p.full_name?.split(' ')[0] ?? '', last_name: p.last_name ?? p.full_name?.split(' ').slice(1).join(' ') ?? '',
      age: String(p.age ?? ''), gender: p.gender ?? '',
      contact_email: [p.contact_email, authEmail].find((e) => e && !isSyntheticEmail(e)) ?? '',
      phone: p.phone?.replace(/^\+91/, '') ?? '', whatsapp: (p.whatsapp || p.phone)?.replace(/^\+91/, '') ?? '',
      state: p.state ?? '', district: p.district ?? p.city ?? '', city: p.city ?? '', pincode: p.pincode ?? '',
    });
  }, [p, data?.user.email]);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const done = async () => {
    await finish({ data: { state: f.state.trim(), district: f.district.trim(), city: f.city.trim() || f.district.trim(), pincode: f.pincode } });
    await qc.invalidateQueries({ queryKey: ['profile'] });
    toast.success('Your profile is ready'); navigate({ to: '/dashboard' });
  };
  const next = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSyntheticEmail(f.contact_email)) { toast.error('Please enter your real email address'); return; }
    if (!f.state || f.district.trim().length < 2) { toast.error('Select state and district'); return; }
    if (f.pincode && !/^\d{6}$/.test(f.pincode)) { toast.error('Pincode must be 6 digits'); return; }
    const result = contactSchema.safeParse(f);
    if (!result.success) { toast.error(result.error.issues[0]?.message ?? 'Check your details'); return; }
    setBusy(true);
    try {
      const r = await saveDetails({ data: result.data }); setNumber(r.number);
      await qc.invalidateQueries({ queryKey: ['profile'] });
      if (r.verified) await done(); else setStep(2);
    } catch (e) { toast.error(friendly(e)); } finally { setBusy(false); }
  };
  const complete = async () => { if (!f.state || f.district.trim().length < 2) { setStep(1); toast.error('Select state and district'); return; } setBusy(true); try { await done(); } catch (e) { toast.error(friendly(e)); } finally { setBusy(false); } };
  const onPin = async (v: string) => { const pin = v.replace(/\D/g, '').slice(0, 6); setF((x) => ({ ...x, pincode: pin })); if (pin.length !== 6) return; setPinBusy(true); const r = await postalLookup(pin); setPinBusy(false); if (!r) return; setAreas(r.areas); setF((x) => ({ ...x, state: INDIAN_STATES.find((s) => s.toLowerCase() === r.state.toLowerCase()) ?? r.state, district: r.district, city: r.city })); };
  const input = 'mt-1 h-12 w-full min-w-0 rounded-md border bg-card px-3';
  const steps = verified ? ['Personal details'] : ['Personal details', 'Verify phone'];

  return (
    <AppShell skipOnboarding requirePhone={false}>
      <PageHeader title='Welcome to GetXpress' sub='Your profile' />
      <div className='max-w-2xl'>
        <div className='mb-8 flex items-center gap-4 border-b pb-5'>
          {steps.map((s, i) => <div key={s} className={`flex items-center gap-2 text-sm font-semibold ${step === i + 1 ? 'text-primary' : 'text-muted-foreground'}`}><span className='grid h-8 w-8 shrink-0 place-items-center rounded-full border'>{step > i + 1 ? <Check className='h-4 w-4' /> : i + 1}</span>{s}</div>)}
        </div>
        {step === 1 ? (
          <form onSubmit={next} className='grid gap-4 sm:grid-cols-2'>
            <label className='text-sm font-semibold'>First name<input maxLength={60} autoComplete='given-name' value={f.first_name} onChange={(e) => set('first_name')(e.target.value)} required className={input} /></label>
            <label className='text-sm font-semibold'>Last name<input maxLength={60} autoComplete='family-name' value={f.last_name} onChange={(e) => set('last_name')(e.target.value)} required className={input} /></label>
            <label className='text-sm font-semibold'>Age<input type='number' min={13} max={100} required value={f.age} onChange={(e) => set('age')(e.target.value)} className={input} /></label>
            <label className='text-sm font-semibold'>Gender<select required value={f.gender} onChange={(e) => set('gender')(e.target.value)} className={input}><option value=''>Select</option><option value='female'>Female</option><option value='male'>Male</option><option value='other'>Other</option></select></label>
            <label className='text-sm font-semibold sm:col-span-2'>Email<input type='email' autoComplete='email' maxLength={255} required placeholder='you@example.com' value={f.contact_email} onChange={(e) => set('contact_email')(e.target.value)} className={input} /></label>
            {verified ? (
              <div className='sm:col-span-2 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary w-fit'><ShieldCheck className='h-4 w-4' />Verified phone · {p?.phone}</div>
            ) : (
              <label className='text-sm font-semibold'>Phone number<div className='relative'><span className='absolute left-3 top-5 text-muted-foreground'>+91</span><input inputMode='numeric' maxLength={10} value={f.phone} onChange={(e) => set('phone')(e.target.value.replace(/\D/g, ''))} className={`${input} pl-12`} /></div></label>
            )}
            <label className='text-sm font-semibold'>WhatsApp number<div className='relative'><span className='absolute left-3 top-5 text-muted-foreground'>+91</span><input inputMode='numeric' maxLength={10} value={f.whatsapp} onChange={(e) => set('whatsapp')(e.target.value.replace(/\D/g, ''))} className={`${input} pl-12`} /></div></label>
            <RegionFields prefix="Profile" state={f.state} district={f.district} onChange={(state,district)=>setF(x=>({...x,state,district}))}/>
            <div className="sm:col-span-2"><PinAutocomplete label="Find city / locality or PIN (optional)" value={f.pincode} city={f.city} onChange={onPin} onPick={h=>setF(x=>({...x,pincode:h.pincode,state:h.state||x.state,district:h.zone||x.district,city:h.city}))}/></div>
            <label className='text-sm font-semibold sm:col-span-2'>City / town<input list='ob-areas' maxLength={80} value={f.city} onChange={(e) => set('city')(e.target.value)} placeholder='e.g. Sanganer' className={input} /><datalist id='ob-areas'>{areas.map((a) => <option key={a} value={a} />)}</datalist></label>
            <Button disabled={busy} type='submit' className='mt-2 h-12 sm:col-span-2'>{busy ? <Loader2 className='animate-spin' /> : verified ? <Check /> : <ArrowRight />}{verified ? 'Finish setup' : 'Continue'}</Button>
          </form>
        ) : (
          <div>
            <Button variant='ghost' onClick={() => setStep(1)}><ArrowLeft />Personal details</Button>
            {!p?.phone_verified
              ? <PhoneVerify key={number} initialPhone={number} onDone={() => qc.invalidateQueries({ queryKey: ['profile'] })} />
              : <p className='my-5 flex items-center gap-2 text-sm font-semibold text-primary'><ShieldCheck />Phone verified · {p.phone}</p>}
            <Button disabled={busy || !p?.phone_verified} onClick={complete} className='mt-4 h-12 w-full'>{busy ? <Loader2 className='animate-spin' /> : <Check />}Finish setup</Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
