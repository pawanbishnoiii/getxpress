import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { reverseGeocode, searchPlaces, type GeoHit } from "@/lib/geo";
import { useServerFn } from "@tanstack/react-start";
import { googlePlaceSearch, googleReverse } from "@/lib/maps.functions";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { searchLocations } from "@/lib/location-search";

const LeafletMap = lazy(() => import("./LeafletMap"));
const GoogleMap = lazy(() => import("./GoogleMap"));

/**
 * Address search with OpenStreetMap suggestions, a draggable map pin and "use my location".
 * Calls onResolve with real coordinates + postcode/city from OSM; the caller validates the pincode against our master list.
 */
export function LocationPicker({ point, onResolve, initialOpen=false }: { initialOpen?:boolean; point: { lat: number; lng: number } | null; onResolve: (hit: GeoHit) => void }) {
  const { user } = useSession();
  const googleSearch = useServerFn(googlePlaceSearch);
  const googlePick = useServerFn(googleReverse);
  const [fallback, setFallback] = useState(false);
  const sequence = useRef(0);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [open, setOpen] = useState(initialOpen);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = (v: string) => {
    setQ(v);
    clearTimeout(t.current);
    const id = ++sequence.current;
    if (v.trim().length < 3) { setHits([]); setBusy(false); return; }
    t.current = setTimeout(async () => { setBusy(true); try { const rows = await searchLocations(v, rows => { if(id === sequence.current) setHits(rows); }); if(id === sequence.current) setHits(rows); } catch { if(id === sequence.current) setHits([]); } if(id === sequence.current) setBusy(false); }, 300);
  };
  const pick = async (lat: number, lng: number) => { setBusy(true); const h = await (user ? googlePick({ data: { lat, lng } }).catch(() => reverseGeocode(lat,lng)) : reverseGeocode(lat, lng)).catch(() => null); setBusy(false); onResolve(h ?? { lat, lng, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }); };
  const locate = () => {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition((p) => { setOpen(true); pick(p.coords.latitude, p.coords.longitude); }, () => setBusy(false), { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex gap-2">
        <label className="relative flex h-11 flex-1 items-center gap-2 rounded-xl border bg-background px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => search(e.target.value)} placeholder="Search area, landmark, society…" className="flex-1 bg-transparent text-sm font-semibold outline-none" />
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {hits.length > 0 && (
            <div className="absolute left-0 top-12 z-[1000] max-h-64 w-full overflow-auto rounded-xl border bg-card shadow-soft">
              {hits.map((h, i) => (
                <button key={i} type="button" onClick={() => { setHits([]); setQ(h.label.split(",").slice(0, 2).join(",")); setOpen(true); onResolve(h); }} className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span>{h.label}{h.pincode && <b className="ml-1 font-mono">{h.pincode}</b>}</span>
                </button>
              ))}
            </div>
          )}
        </label>
        <Button type="button" size="icon" onClick={locate} aria-label="Use my location" className="h-11 w-11"><Crosshair /></Button>
        <Button type="button" variant="outline" onClick={() => setOpen(!open)} className="h-11">{open ? "Hide map" : "Map"}</Button>
      </div>
      {open && (
        <div className="mt-3">
          <ClientOnly fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
            <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" />}>
              {fallback ? <LeafletMap lat={point?.lat ?? 26.9124} lng={point?.lng ?? 75.7873} onPick={pick} /> : <GoogleMap lat={point?.lat ?? 26.9124} lng={point?.lng ?? 75.7873} onPick={pick} onError={() => { setMapError(true); setFallback(true); }} />}
            </Suspense>
          </ClientOnly>
          {mapError && <p role="alert" className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">Google Maps could not load here, so OpenStreetMap is shown instead. You can still drop the pin or type the address.</p>}<div className="mt-1 flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{fallback ? "© OpenStreetMap contributors" : "Google Maps"}</span><Button size="sm" variant="ghost" onClick={() => setFallback(!fallback)}>{fallback ? "Google Maps" : "OpenStreetMap"}</Button></div>
        </div>
      )}
    </div>
  );
}
