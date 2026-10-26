import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, BadgeCheck, Coins, GraduationCap, Loader2, PackageOpen, ScanLine, Store, TrendingUp, Users } from "lucide-react";
import { SiteNav, MobileTabBar } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ParcelLottie } from "@/components/site/ParcelLottie";
import { useLandingMotion } from "@/hooks/use-landing-motion";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import hubTeam from "@/assets/hub-team.jpg";
import hubPartner from "@/assets/hub-partner.jpg";
import upManagerImg from "@/assets/hub-team.jpg";
import upSellerImg from "@/assets/gx-seller.jpg";
import upCourierImg from "@/assets/login-courier.jpg";
import upDoorImg from "@/assets/hub-partner.jpg";

export const Route = createFileRoute("/point-partner")({
  head: () => ({
    meta: [
      { title: "Become a Get Xpress Hub — Earn from your shop | getxpress.in" },
      { name: "description", content: "Turn your shop into a Get Xpress Hub. Earn commission on every parcel booked, received and handed over. Zero franchise fee." },
      { property: "og:title", content: "Become a Get Xpress Hub partner" },
      { property: "og:description", content: "Earn on every parcel from your counter. Apply in 3 minutes." },
    , { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }],
  }),
  component: PointPartner,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile"),
  whatsapp: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit WhatsApp number"),
  email: z.string().trim().email("Enter a valid email").max(255),
  age: z.coerce.number({ invalid_type_error: "Enter your age" }).int().min(18, "You must be 18+").max(80),
  gender: z.enum(["female", "male", "other"], { errorMap: () => ({ message: "Select gender" }) }),
  business_name: z.string().trim().min(2, "Enter shop / business name").max(120),
  business_type: z.string().min(2).max(60),
  pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit pincode"),
  state: z.string().trim().min(2, "Select your state").max(80),
  district: z.string().trim().min(2, "Enter your district").max(80),
  city: z.string().trim().min(2, "Enter your city / town").max(80),
  address: z.string().trim().min(5, "Enter address line 1").max(200),
  address_line2: z.string().trim().min(3, "Enter address line 2").max(200),
  space_sqft: z.coerce.number({ invalid_type_error: "Enter space in sq ft" }).int().min(20, "Minimum 20 sq ft").max(100000),
  daily_capacity: z.coerce.number({ invalid_type_error: "Enter parcels per day" }).int().min(5, "Minimum 5 parcels/day").max(100000),
  message: z.string().trim().max(1000).optional(),
});
const STATES = ["Andaman & Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh","Dadra & Nagar Haveli and Daman & Diu","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu & Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];

const perks = [
  { icon: Coins, t: "Earn per parcel", d: "Commission on every booking, receive and handover — paid weekly.", c: "bg-sun" },
  { icon: Users, t: "More footfall", d: "Parcel customers walk in daily — and buy from your shop too.", c: "bg-lilac" },
  { icon: ScanLine, t: "App-first counter", d: "Scan, label and hand over from your phone. No heavy machines.", c: "bg-lime" },
  { icon: GraduationCap, t: "Training & kit", d: "Free onboarding, branded signage, tape and scanner support.", c: "bg-sky" },
];

const steps = [
  { n: "01", t: "Apply in 3 minutes", d: "Tell us about your shop and space." },
  { n: "02", t: "Verification visit", d: "Our team verifies location and documents." },
  { n: "03", t: "Training & kit", d: "Get signage, packing kit and app access." },
  { n: "04", t: "Go live & earn", d: "Start accepting parcels the same week." },
];

function PointPartner() {
  const root = useRef<HTMLDivElement>(null);
  useLandingMotion(root);
  const [parcels, setParcels] = useState(40);
  const monthly = Math.round(parcels * 26 * 18);
  return (
    <div ref={root} className="min-h-screen overflow-hidden bg-background text-ink">
      <SiteNav />
      <section className="hero-shell relative bg-hero px-4 pb-16 pt-28 md:px-8 md:pt-40">
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <span className="hero-rise inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs font-extrabold"><Store className="h-4 w-4 text-primary" /> Get Xpress Hub Partner Program</span>
            <h1 className="hero-rise mt-6 font-display text-[clamp(2.8rem,7vw,6rem)] font-extrabold leading-[.9] tracking-[-.05em]">Your shop.<br /><span className="text-primary">Our network.</span><br />Shared growth.</h1>
            <p className="hero-rise mx-auto mt-6 max-w-lg text-lg text-muted-foreground lg:mx-0">Kirana, mobile shop, stationery or boutique — turn any counter into a mini hub and earn on every parcel. Zero franchise fee.</p>
            <div className="hero-rise mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a href="#apply" className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-4 font-bold text-primary-foreground shadow-glow">Apply now <ArrowRight className="h-4 w-4" /></a>
              <a href="#earn" className="inline-flex items-center gap-2 rounded-2xl border bg-card px-6 py-4 font-bold">Calculate earnings</a>
            </div>
          </div>
          <div className="hero-art relative">
            <div className="grid grid-cols-2 gap-3">
              <img src={hubPartner} alt="Get Xpress Hub partner at her counter" className="row-span-2 h-full rounded-[32px] object-cover shadow-soft" />
              <img src={upManagerImg} alt="Get Xpress hub manager" loading="lazy" className="aspect-square rounded-[28px] object-cover shadow-soft" />
              <img src={upCourierImg} alt="Get Xpress courier" loading="lazy" className="aspect-square rounded-[28px] object-cover shadow-soft" />
            </div>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute -bottom-6 left-6 flex items-center gap-3 rounded-2xl bg-card p-3 pr-5 shadow-soft">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime"><TrendingUp className="h-5 w-5" /></span>
              <div><p className="text-xs font-bold text-muted-foreground">Avg. partner earning</p><p className="font-display text-xl font-extrabold">₹18,000/mo</p></div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 md:px-8">
        <div className="mx-auto grid max-w-[1240px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map(({ icon: Icon, t, d, c }) => (
            <motion.div whileHover={{ y: -6, rotate: -0.5 }} key={t} className={`reveal rounded-[28px] p-7 ${c}`}>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-card"><Icon className="h-6 w-6" /></span>
              <h3 className="mt-6 font-display text-2xl font-extrabold">{t}</h3>
              <p className="mt-2 text-sm opacity-75">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="earn" className="px-4 pb-20 md:px-8">
        <div className="reveal mx-auto grid max-w-[1240px] items-center gap-8 overflow-hidden rounded-[40px] bg-ink p-8 text-ink-foreground md:grid-cols-[1fr_auto] md:p-14">
          <div>
            <h2 className="font-display text-4xl font-extrabold md:text-5xl">How much can you earn?</h2>
            <p className="mt-2 opacity-70">Drag to set parcels handled per day (estimate at ₹18/parcel, 26 working days).</p>
            <input type="range" min={10} max={300} value={parcels} onChange={(e) => setParcels(Number(e.target.value))} className="mt-8 w-full accent-primary" aria-label="Parcels per day" />
            <p className="mt-2 text-sm font-bold">{parcels} parcels / day</p>
          </div>
          <div className="rounded-[28px] bg-primary p-8 text-center text-primary-foreground">
            <p className="text-sm font-bold opacity-80">Estimated monthly</p>
            <motion.p key={monthly} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-5xl font-extrabold">₹{monthly.toLocaleString("en-IN")}</motion.p>
          </div>
        </div>
      </section>

      <section className="timeline-shell px-4 pb-24 md:px-8">
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-2">
          <img src={hubTeam} alt="Get Xpress Hub team" loading="lazy" className="reveal rounded-[36px] object-cover shadow-soft" />
          <div>
            <h2 className="reveal font-display text-4xl font-extrabold md:text-5xl">Live in 4 simple steps</h2>
            <div className="mt-8 space-y-3">
              {steps.map((s) => (
                <div key={s.n} className="timeline-card flex items-center gap-4 rounded-3xl border bg-card p-5">
                  <span className="font-display text-3xl font-extrabold text-primary">{s.n}</span>
                  <div><p className="font-bold">{s.t}</p><p className="text-sm text-muted-foreground">{s.d}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 md:px-8">
        <div className="mx-auto flex max-w-[1240px] gap-3 overflow-x-auto pb-2">
          {[upSellerImg, upDoorImg, upManagerImg, upCourierImg].map((src, i) => (
            <img key={i} src={src} alt="Get Xpress in action" loading="lazy" className="reveal h-64 w-72 shrink-0 rounded-[28px] object-cover" />
          ))}
        </div>
      </section>

      <ApplySection />
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}

type App = { reference: string; status: string; business_name: string; created_at: string };

function ApplySection() {
  const { user, loading } = useSession();
  const [busy, setBusy] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const [loc, setLoc] = useState({ pincode: "", state: "", district: "", city: "" });
  const [cities, setCities] = useState<string[]>([]);
  const [pinBusy, setPinBusy] = useState(false);
  const onPin = async (pin: string) => {
    setLoc((l) => ({ ...l, pincode: pin }));
    if (pin.length !== 6) return;
    setPinBusy(true);
    try {
      const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`).then((x) => x.json()).catch(() => null);
      const offices: { Name: string; District: string; State: string; Block?: string }[] = r?.[0]?.PostOffice ?? [];
      if (offices[0]) {
        setLoc({ pincode: pin, state: offices[0].State, district: offices[0].District, city: offices[0].Block && offices[0].Block !== "NA" ? offices[0].Block : offices[0].District });
        setCities([...new Set(offices.flatMap((o) => [o.Name, o.Block ?? ""]).filter((x) => x && x !== "NA"))]);
      } else {
        const { data } = await supabase.from("pincodes").select("city,state").eq("pincode", pin).maybeSingle();
        if (data) setLoc({ pincode: pin, state: data.state, district: data.city, city: data.city });
        else toast.error("Pincode not found — please fill state, district and city.");
      }
    } finally { setPinBusy(false); }
  };
  const load = async () => {
    const { data } = await supabase.from("point_applications").select("reference,status,business_name,created_at").order("created_at", { ascending: false });
    setApps(data ?? []);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check the form"); return; }
    setBusy(true);
    const { error } = await supabase.from("point_applications").insert({ ...parsed.data, message: parsed.data.message ?? null, user_id: user.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Application submitted! We'll call you within 48 hours.");
    form.reset(); setLoc({ pincode: "", state: "", district: "", city: "" });
    load();
  };

  const input = "h-12 w-full rounded-2xl border bg-background px-4 font-semibold outline-none focus:ring-2 focus:ring-ring";
  return (
    <section id="apply" className="bg-cream px-4 py-24 md:px-8">
      <div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <ParcelLottie className="h-32 w-32" />
          <h2 className="font-display text-4xl font-extrabold md:text-5xl">Apply to become a Hub</h2>
          <p className="mt-3 text-muted-foreground">Takes 3 minutes. Our partner team reviews every application personally.</p>
          {apps.length > 0 && (
            <div className="mt-8 space-y-2">
              <p className="text-sm font-bold">Your applications</p>
              {apps.map((a) => (
                <div key={a.reference} className="flex items-center justify-between rounded-2xl bg-card p-4">
                  <div><p className="font-bold">{a.business_name}</p><p className="text-xs text-muted-foreground">{a.reference}</p></div>
                  <span className="rounded-full bg-lime px-3 py-1 text-xs font-bold capitalize">{a.status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-[32px] bg-card p-6 shadow-soft md:p-8">
          {loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : !user ? (
            <div className="py-10 text-center">
              <PackageOpen className="mx-auto h-12 w-12 text-primary" />
              <p className="mt-4 text-lg font-bold">Sign in to start your application</p>
              <p className="text-sm text-muted-foreground">So you can track its status anytime.</p>
              <Link to="/auth" search={{ redirect: "/point-partner" }} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-4 font-bold text-primary-foreground">Continue with Google <ArrowRight className="h-4 w-4" /></Link>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <input name="full_name" placeholder="Your full name" className={input} defaultValue={user.user_metadata?.["full_name"] ?? ""} />
              <input name="email" type="email" placeholder="Email" className={input} defaultValue={user.email ?? ""} />
              <input name="phone" placeholder="Mobile (10 digits)" inputMode="numeric" maxLength={10} className={input} />
              <input name="whatsapp" placeholder="WhatsApp number" inputMode="numeric" maxLength={10} className={input} />
              <input name="age" type="number" placeholder="Age" className={input} />
              <select name="gender" className={input} defaultValue=""><option value="" disabled>Gender</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select>
              <input name="business_name" placeholder="Shop / business name" className={input} />
              <select name="business_type" className={input} defaultValue="Kirana / General store">
                {["Kirana / General store", "Mobile & electronics", "Stationery / Xerox", "Boutique / Fashion", "Pharmacy", "Courier counter", "Other"].map((o) => <option key={o}>{o}</option>)}
              </select>
              <div className="relative sm:col-span-2"><input name="pincode" placeholder="Pincode — state & district fill automatically" inputMode="numeric" maxLength={6} className={input} value={loc.pincode} onChange={(e) => onPin(e.target.value.replace(/\D/g, ""))} />{pinBusy && <Loader2 className="absolute right-4 top-4 h-4 w-4 animate-spin" />}</div>
              <select name="state" className={input} value={loc.state} onChange={(e) => setLoc({ ...loc, state: e.target.value })}><option value="">Select state</option>{STATES.map((s) => <option key={s}>{s}</option>)}{loc.state && !STATES.includes(loc.state) && <option>{loc.state}</option>}</select>
              <input name="district" placeholder="District" className={input} value={loc.district} onChange={(e) => setLoc({ ...loc, district: e.target.value })} />
              <input name="city" placeholder="City / town" className={`${input} sm:col-span-2`} list="pin-cities" value={loc.city} onChange={(e) => setLoc({ ...loc, city: e.target.value })} />
              <datalist id="pin-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
              <input name="address" placeholder="Address line 1 (shop no., building)" className={`${input} sm:col-span-2`} />
              <input name="address_line2" placeholder="Address line 2 (street, area, landmark)" className={`${input} sm:col-span-2`} />
              <input name="space_sqft" type="number" placeholder="Space for parcels (sq ft)" className={input} />
              <input name="daily_capacity" type="number" placeholder="Parcels you can handle / day" className={input} />
              <textarea name="message" placeholder="Anything else? (optional)" className={`${input} h-20 py-3 sm:col-span-2`} />
              <button disabled={busy} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink font-bold text-ink-foreground sm:col-span-2">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <BadgeCheck className="h-5 w-5" />} Submit hub application
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
