import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Browser-only Leaflet map with OpenStreetMap tiles; click or drag the pin to choose a point. */
export default function LeafletMap({ lat, lng, onPick }: { lat: number; lng: number; onPick: (lat: number, lng: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true }).setView([lat, lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(m);
    const icon = L.divIcon({ className: "", html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--primary);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.3)"></div>', iconSize: [28, 28], iconAnchor: [14, 28] });
    const mk = L.marker([lat, lng], { draggable: true, icon }).addTo(m);
    mk.on("dragend", () => { const p = mk.getLatLng(); pickRef.current(p.lat, p.lng); });
    m.on("click", (e: L.LeafletMouseEvent) => { mk.setLatLng(e.latlng); pickRef.current(e.latlng.lat, e.latlng.lng); });
    map.current = m; marker.current = mk;
    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || !marker.current) return;
    marker.current.setLatLng([lat, lng]);
    map.current.setView([lat, lng], Math.max(map.current.getZoom(), 14));
  }, [lat, lng]);

  return <div ref={el} className="h-64 w-full overflow-hidden rounded-2xl border" />;
}
