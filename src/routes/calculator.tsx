import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Calculator, Globe2, Loader2, MapPin, Plane, Plus, Scale, Trash2, ShieldCheck } from "lucide-react";
import { WorldPlaceAutocomplete } from "@/components/site/WorldPlaceAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { intlCountries, intlQuote } from "@/lib/intl-rates.functions";
import { allCountries } from "@/lib/countries";
import { CountrySelect } from "@/components/site/CountrySelect";
import { z } from "zod";
import { toast } from "sonner";

export const Route = createFileRoute("/calculator")({
  validateSearch: (s) => z.object({ country: z.string().max(60).optional() }).parse(s),
  head: () => ({ meta: [
    { title: "International courier rate calculator | GetXpress" },
    { name: "description", content: "Pick a country, enter the destination pincode, add your products and compare GetXpress air courier prices with doorstep pickup." },
    { property: "og:title", content: "GetXpress international rate calculator" },
    { property: "og:description", content: "Compare air courier prices with pickup from India to 30+ countries." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CalculatorPage,
});

type Row = { name: string; qty: number; weight: number; value: number };
const codeOf = (name: string) => allCountries().find((c) => c.name === name || (name === "United States" && c.code === "US"))?.code;

function CalculatorPage() {
  const list = useServerFn(intlCountries), quote = useServerFn(intlQuote);
  const { data: countries = [] } = useQuery({ queryKey: ["intl-countries"], queryFn: () => list(), staleTime: Infinity });
  const search = Route.useSearch();
  const [country, setCountry] = useState(search.country || "United Kingdom"), [postal, setPostal] = useState(""), [place, setPlace] = useState("");
  const [items, setItems] = useState<Row[]>([{ name: "", qty: 1, weight: 1, value: 0 }]);
  const [dims, setDims] = useState({ l: 0, w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Awaited<ReturnType<typeof intlQuote>> | null>(null);
  const meta = countries.find((c) => c.name === country);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some((i) => !i.name.trim())) { toast.error("Add a name for each product"); return; }
    if (items.some((i) => !(i.weight >= 0.05))) { toast.error("Enter the weight per piece in kg — it decides the price"); return; }
    setBusy(true);
    try { setRes(await quote({ data: { country, code: meta?.code || codeOf(country), postal, items, ...dims } })); } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };
  const set = (i: number, p: Partial<Row>) => setItems((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="gx-calculator mx-auto max-w-[1180px] px-4 pb-16 pt-28 md:px-8">
        <header className="gx-calculator-head">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase text-primary"><Calculator className="h-4 w-4" />Rate calculator</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Know your international shipping cost.</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">Tell us where it’s going and what you’re sending. Compare available air options before you request a reviewed quote.</p>
          </div>
          <div className="gx-calculator-steps" aria-label="Three easy steps">
            {["Destination", "Parcel details", "Compare options"].map((step, i) => <span key={step}><b>0{i + 1}</b>{step}</span>)}
          </div>
        </header>
        <form onSubmit={run} className="mt-8 grid items-start gap-6 lg:grid-cols-[1.3fr_.8fr]">
          <div className="gx-calculator-form space-y-5 rounded-[28px] border bg-card p-5 md:p-7">
            <div className="gx-calculator-section-title"><span>01</span><div><h2>Where are you sending?</h2><p>Choose the destination and enter a city or postal code.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">Destination country
                <CountrySelect label="Destination country" value={country} options={countries.map((c) => c.name)} onChange={(v) => { setCountry(v); setPostal(""); setPlace(""); setRes(null); }} />
              </label>
              <label className="text-sm font-semibold">Destination pincode / city{meta?.needsPostal ? "" : " (optional)"}
                <WorldPlaceAutocomplete label="Destination pincode or city" value={postal} country={country} countryCode={meta?.code || codeOf(country)} required={!!meta?.needsPostal}
                  placeholder={meta?.postalHint || "Type a postal code or city"} icon={<MapPin className="h-4 w-4 text-primary" />}
                  onChange={(v) => { setPostal(v.slice(0, 20)); setPlace(""); setRes(null); }}
                  onPick={(p) => { setPostal(p.postal_code || p.city); setPlace([p.city, p.region].filter(Boolean).join(", ")); setRes(null); }} />
                {place && <span className="mt-1 block text-xs font-normal text-muted-foreground">{place}</span>}
              </label>
            </div>
            <div className="gx-calculator-section-title pt-2"><span>02</span><div><h2>What’s inside the parcel?</h2><p>Accurate weight and quantity help estimate a more useful price.</p></div></div>
            <div>
              <div className="space-y-3">
                {items.map((it, i) => (
                  <div key={i} className="gx-calculator-item rounded-xl border bg-background p-4">
                    <div className="flex items-center justify-between gap-3"><p className="text-xs font-extrabold uppercase tracking-[.12em] text-muted-foreground">Parcel item {String(i + 1).padStart(2, "0")}</p><Button type="button" size="icon" variant="ghost" aria-label="Remove product" disabled={items.length === 1} onClick={() => setItems((r) => r.filter((_, j) => j !== i))}><Trash2 /></Button></div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_.7fr_.9fr]">
                      <label className="text-xs font-semibold">What are you sending?<Input aria-label="Product" placeholder="e.g. Cotton kurta" value={it.name} onChange={(e) => set(i, { name: e.target.value })} maxLength={80} className="mt-1" /></label>
                      <label className="text-xs font-semibold">Pieces<Input aria-label="Qty" type="number" min={1} value={it.qty} onChange={(e) => set(i, { qty: Math.max(1, +e.target.value) })} className="mt-1" /></label>
                      <label className="text-xs font-semibold">Declared value / pc (₹)<Input aria-label="Value ₹" type="number" min={0} value={it.value} onChange={(e) => set(i, { value: +e.target.value })} className="mt-1" /></label>
                    </div>
                    <div className="gx-weight-card mt-4">
                      <div><span><Scale className="h-4 w-4" />Weight per item</span><p>This has the biggest effect on the shipping estimate.</p></div>
                      <label><Input aria-label="Weight kg" type="number" step="0.05" min={0.05} max={100} required value={it.weight} onChange={(e) => set(i, { weight: +e.target.value })} /><b>kg</b></label>
                      <div className="gx-weight-presets">{[0.5, 1, 2, 5, 10].map((w) => <button type="button" key={w} onClick={() => set(i, { weight: w })} className={it.weight === w ? "is-active" : ""}>{w} kg</button>)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm font-semibold">Total weight: <span className="text-primary">{items.reduce((a, x) => a + x.qty * (x.weight || 0), 0).toFixed(2)} kg</span> · {items.reduce((a, x) => a + x.qty, 0)} pcs</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setItems((r) => [...r, { name: "", qty: 1, weight: 1, value: 0 }])}><Plus />Add product</Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["l", "w", "h"] as const).map((k) => <label key={k} className="text-xs font-semibold">{k === "l" ? "Length" : k === "w" ? "Width" : "Height"} (cm)<Input type="number" min={0} placeholder="Optional" value={dims[k] || ""} onChange={(e) => setDims({ ...dims, [k]: +e.target.value })} className="mt-1" /></label>)}
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Plane />}Compare shipping options</Button>
          </div>
          <aside className="gx-calculator-results space-y-3">
            <div className="gx-calculator-results-head"><span>03</span><div><h2>Your options</h2><p>Compare the available services for this parcel.</p></div></div>
            {!res ? <div className="gx-calculator-empty rounded-[28px] border p-8 text-center text-sm text-muted-foreground"><span><Globe2 className="h-7 w-7 text-primary" /></span><b>Your estimate will appear here</b><p>Add your destination and parcel details, then compare options.</p></div>
              : !res.ok ? <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm">{res.error} <Link to="/international" className="font-bold text-primary">Request a quote</Link></div>
              : <>
                <div className="rounded-2xl border bg-card p-4 text-sm"><p className="font-semibold text-muted-foreground">Customer price · chargeable weight {res.chargeableKg} kg</p><p className="mt-1 text-xs text-muted-foreground">Actual {res.actualKg} kg · volumetric {res.volumetricKg} kg{res.zone ? ` · destination zone ${res.zone}` : ""}</p></div>
                {res.options.map((o, i) => (
                  <div key={o.id} className={`rounded-2xl border p-5 ${i === 0 ? "border-primary bg-primary/5" : "bg-card"}`}>
                    <div className="flex items-center justify-between"><p className="font-bold">{o.name}</p><p className="text-2xl font-extrabold">₹{o.price.toLocaleString("en-IN")}</p></div>
                    <p className="mt-1 text-xs text-muted-foreground">{o.days}</p><p className="mt-2 text-[11px] font-semibold text-muted-foreground">Fulfilment: {o.provider}</p>
                  </div>
                ))}
                <Button asChild className="w-full"><Link to="/international">Book this shipment</Link></Button>
              </>}
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />Final price confirmed after parcel inspection.</p>
          </aside>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

