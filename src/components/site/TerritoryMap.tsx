import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type TerritoryPoint = { pincode: string; label: string };
const cache = new Map<string, [number, number] | null>();

async function geocode(pin: string): Promise<[number, number] | null> {
  if (cache.has(pin)) return cache.get(pin)!;
  const saved = typeof localStorage !== "undefined" ? localStorage.getItem(`gx-pin-${pin}`) : null;
  if (saved) { const v = JSON.parse(saved) as [number, number]; cache.set(pin, v); return v; }
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pin}&country=India&format=json&limit=1`);
    const j = (await r.json()) as { lat: string; lon: string }[];
    const v: [number, number] | null = j[0] ? [Number(j[0].lat), Number(j[0].lon)] : null;
    cache.set(pin, v); if (v) localStorage.setItem(`gx-pin-${pin}`, JSON.stringify(v));
    return v;
  } catch { return null; }
}

/** Browser-only map plotting assigned PIN codes with staff names. */
export default function TerritoryMap({ points }: { points: TerritoryPoint[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current).setView([22.5, 79], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(m);
    layer.current = L.layerGroup().addTo(m); map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    let alive = true;
    (async () => {
      const g = layer.current; if (!g || !map.current) return;
      g.clearLayers(); const bounds: [number, number][] = [];
      for (const p of points.slice(0, 60)) {
        const ll = await geocode(p.pincode); if (!alive) return; if (!ll) continue;
        bounds.push(ll);
        L.circleMarker(ll, { radius: 9, color: "hsl(24 95% 50%)", fillOpacity: 0.7 }).bindPopup(`<b>${p.pincode}</b><br/>${p.label}`).addTo(g);
      }
      if (bounds.length) map.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
    })();
    return () => { alive = false; };
  }, [points]);
  return <div ref={el} className="h-[420px] w-full overflow-hidden rounded-2xl border" />;
}
