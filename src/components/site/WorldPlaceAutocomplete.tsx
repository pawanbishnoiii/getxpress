import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { allCountries } from "@/lib/countries";
import { directorySearch } from "@/lib/india-directory";
import { supabase } from "@/integrations/supabase/client";
import { googlePlacePostal, googlePlaceSuggest } from "@/lib/maps.functions";

// One Google autocomplete session per few minutes keeps lookups cheap.
let gSession = { id: "", at: 0 };
const sessionId = () => { if (!gSession.id || Date.now() - gSession.at > 180_000) { const id = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `gx-${Date.now()}-${Math.random().toString(16).slice(2)}`; gSession = { id, at: Date.now() }; } return gSession.id; };

export type WorldPlace = { city: string; postal_code: string; region: string; label: string; placeId?: string };
const cache = new Map<string, WorldPlace[]>();

/** Search cities, towns and postal codes worldwide, limited to the chosen country. */
export async function searchWorldPlaces(q: string, countryName: string, countryCode?: string): Promise<WorldPlace[]> {
  const code = (countryCode || allCountries().find((c) => c.name === countryName)?.code || "").toUpperCase();
  const key = `${code}|${q.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key)!;
  if (code === "IN" || countryName === "India") {
    // Faster India path: built-in PIN directory, no network.
    const rows = await directorySearch(q);
    const out = rows.map((r) => ({ city: r.city, postal_code: r.pincode, region: [r.district, r.state].filter(Boolean).join(", "), label: `${r.city} · ${r.state} · ${r.pincode}` }));
    cache.set(key, out);
    return out;
  }
  // Signed-in users: Google suggestions (cities and partial postal codes, every country). Others use OpenStreetMap below.
  if (code) {
    const { data: auth } = await supabase.auth.getSession();
    if (auth.session) {
      const g = await googlePlaceSuggest({ data: { q: q.slice(0, 80), country: code, session: sessionId() } }).catch(() => null);
      if (g?.length) { cache.set(key, g); return g; }
    }
  }
  type N = { address?: { city?: string; town?: string; village?: string; suburb?: string; postcode?: string; state?: string; county?: string }; name?: string };
  const nominatim = async (params: string) => {
    const n = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=40&${params}${code ? `&countrycodes=${code.toLowerCase()}` : ""}`, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "GetXpress/1.0 (https://getxpress.in; support@getxpress.in)", "Accept-Language": "en" } });
    if (!n.ok) throw new Error("search failed");
    return ((await n.json()) as N[]).map((r) => { const a = r.address ?? {}; const city = a.city || a.town || a.village || a.suburb || r.name || ""; return { city, postal_code: a.postcode ?? "", region: a.state ?? a.county ?? "", label: [city, a.state, a.postcode].filter(Boolean).join(" · ") }; }).filter((p) => p.city);
  };
  const dedupe = (rows: WorldPlace[]) => { const seen = new Set<string>(); return rows.filter((r) => { const id = `${r.city}|${r.postal_code}`.toLowerCase(); if (seen.has(id)) return false; seen.add(id); return true; }); };
  // Postal codes: ask OpenStreetMap for that code inside the chosen country (exact and fast).
  if (/\d/.test(q) && code) {
    const out = dedupe(await nominatim(`postalcode=${encodeURIComponent(q.slice(0, 20))}`).catch(() => [] as WorldPlace[]));
    if (out.length) { cache.set(key, out); return out; }
  }
  const countryName2 = allCountries().find((c) => c.code?.toUpperCase() === code)?.name ?? countryName;
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(`${q.slice(0, 80)}${code && !/\d/.test(q) ? ` ${countryName2}` : ""}`)}&limit=50&lang=en&layer=city&layer=locality&layer=district&layer=postcode`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!res || !res.ok) {
    // Fallback: OpenStreetMap search limited to the country.
    const out = dedupe(await nominatim(`q=${encodeURIComponent(q)}`));
    cache.set(key, out);
    return out;
  }
  type P = { countrycode?: string; city?: string; town?: string; village?: string; osm_value?: string; type?: string; name?: string; postcode?: string; state?: string; county?: string };
  const j = (await res.json()) as { features?: { properties: P }[] };
  const out: WorldPlace[] = [];
  for (const f of j.features ?? []) {
    const p = f.properties;
    if (code && p.countrycode?.toUpperCase() !== code) continue;
    const city = p.city || p.town || p.village || (["city", "town", "village", "suburb", "locality", "district"].includes(p.osm_value ?? p.type ?? "") ? p.name : "") || p.name || "";
    if (!city) continue;
    const postal = (p.postcode ?? "").split(/[;,]/)[0]!.trim();
    out.push({ city, postal_code: postal, region: p.state ?? p.county ?? "", label: [city, p.state, postal].filter(Boolean).join(" · ") });
  }
  let final = dedupe(out);
  if (!final.length && code) final = dedupe(await nominatim(`q=${encodeURIComponent(q)}`).catch(() => [] as WorldPlace[]));
  cache.set(key, final);
  return final;
}

export function WorldPlaceAutocomplete({ label, value, country, countryCode, required = true, placeholder, onChange, onPick, icon }: {
  label: string; value: string; country: string; countryCode?: string | undefined; required?: boolean; placeholder?: string;
  onChange: (v: string) => void; onPick: (p: WorldPlace) => void; icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<WorldPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const seq = useRef(0);
  const typed = useRef(false);

  useEffect(() => {
    const my = ++seq.current;
    const q = value.trim();
    if (!open || !typed.current || q.length < 2 || !country) { setHits([]); setBusy(false); return; }
    const t = setTimeout(async () => {
      setBusy(true);
      try { const r = await searchWorldPlaces(q, country, countryCode); if (my === seq.current) { setHits(r); setFailed(false); setActive(0); } }
      catch { if (my === seq.current) { setHits([]); setFailed(true); } }
      finally { if (my === seq.current) setBusy(false); }
    }, 220);
    return () => clearTimeout(t);
  }, [value, country, countryCode, open]);

  const pick = (p: WorldPlace) => {
    typed.current = false; onPick(p); setHits([]); setOpen(false);
    // City picked without a postal code: look up the city's main postal code and fill it in.
    if (!p.postal_code && p.placeId) void googlePlacePostal({ data: { placeId: p.placeId, session: sessionId() } }).then((r) => { if (r?.postal_code) onPick({ ...p, postal_code: r.postal_code }); }).catch(() => {});
  };

  return (
    <div className="relative mt-1">
      <div className="flex h-11 items-center gap-2 rounded-md border bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
        {icon}
        <input aria-label={label} role="combobox" aria-expanded={open && hits.length > 0} autoComplete="off" required={required}
          value={value} placeholder={country ? placeholder : "Select the country first"} disabled={!country}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => { typed.current = true; setOpen(true); onChange(e.target.value.slice(0, 80)); }}
          onKeyDown={(e) => {
            if (!open || !hits.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" || e.key === "Tab") { const h = hits[active]; if (h) { if (e.key === "Enter") e.preventDefault(); pick(h); } }
            else if (e.key === "Escape") setOpen(false);
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-normal outline-none placeholder:text-muted-foreground" />
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {open && hits.length > 0 && (
        <ul role="listbox" className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-lg">
          {hits.map((h, i) => (
            <li key={`${h.city}-${h.postal_code}-${i}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => pick(h)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm font-normal ${i === active ? "bg-secondary" : ""}`}>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0"><span className="font-semibold">{h.city}</span>{h.postal_code && <span className="ml-2 font-mono text-xs">{h.postal_code}</span>}
                  {h.region && <span className="block truncate text-xs text-muted-foreground">{h.region}</span>}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !busy && typed.current && value.trim().length >= 2 && !hits.length && country && (
        <p role="status" className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-xs text-muted-foreground shadow">
          {failed ? "Suggestions are unavailable right now — type the name yourself." : "No match found — check the spelling or type it in yourself."}
        </p>
      )}
    </div>
  );
}
