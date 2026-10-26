import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, CheckCircle2 } from "lucide-react";
import { lookupPins, type PinHit } from "@/lib/pin-lookup";
import { preloadPins } from "@/lib/india-directory";
import { Button } from '@/components/ui/button';

/** Pincode / city / locality box with instant suggestions from the pincode master and OpenStreetMap. */
export function PinAutocomplete({ label, value, city, onChange, onPick, compact = false }: {
  label: string; value: string; city?: string | undefined; compact?: boolean;
  onChange: (v: string) => void; onPick: (h: PinHit) => void;
}) {
  const [text, setText] = useState(value);
  const [hits, setHits] = useState<PinHit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);
  useEffect(() => { if(value || !open) setText(value); }, [value]);
  useEffect(() => { preloadPins(); }, []);

  useEffect(() => {
    const my = ++seq.current;
    if (!open) { setBusy(false); return; }
    const q = text.trim();
    if (q.length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      setBusy(true);
      let err = false;
      const r = await lookupPins(q).catch(() => { err = true; return [] as PinHit[]; });
      if (my === seq.current) { setFailed(err); setHits(r); setActive(0); setBusy(false); }
    }, /^\d+$/.test(q) ? 40 : 120);
    return () => { clearTimeout(t); seq.current++; };
  }, [text, open]);

  const pick = (h: PinHit) => { setText(h.pincode); onPick(h); setOpen(false); };
  const ok = /^\d{6}$/.test(value) && !!city;

  return (
    <div className="relative">
      <label className={`block rounded-2xl border bg-card px-3 focus-within:ring-2 focus-within:ring-ring ${compact ? "py-2" : "py-2.5"}`}>
        <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : ok ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : null}</span>
        <input aria-label={label} value={text} placeholder="PIN, city or town" autoComplete="off"
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!hits.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if ((e.key === "Enter" || e.key === "Tab") && open) { const hit = hits[active]; if (hit && text.trim() && !(ok && text === value)) { if (e.key === "Enter") e.preventDefault(); pick(hit); } }
          }}
          onChange={(e) => { const v = e.target.value.slice(0, 40); setText(v); setOpen(true); onChange(/^\d+$/.test(v) ? v.slice(0, 6) : ""); }}
          className="w-full bg-transparent text-base font-bold text-ink outline-none placeholder:font-medium placeholder:text-muted-foreground/60" />
        {city && !compact && <span className="block truncate text-xs text-muted-foreground">{city}</span>}
      </label>
      {open && !busy && hits.length === 0 && text.trim().length >= 2 && (
        <p role="status" className="absolute z-50 mt-1 w-full rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-soft">{failed ? "Location search is unavailable right now. Type the 6-digit PIN and pick state and district below." : /^\d{6}$/.test(text.trim()) ? "City/State not found for this pincode. Check the PIN or enter the location manually." : "No match. Try a 6-digit PIN or another spelling of the town."}</p>
      )}
      {open && hits.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-soft">
          {hits.map((h, i) => (
            <Button variant="ghost" key={`${h.source}-${h.pincode}-${i}`} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(h)}
              className={`h-auto w-full justify-start items-start gap-2 whitespace-normal rounded-md px-3 py-2 text-left text-sm ${i === active ? "bg-muted" : ""}`}>
              <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${h.source === "map" ? "text-accent-foreground" : "text-primary"}`} />
              <span className="min-w-0">
                <span className="font-mono font-bold">{h.pincode}</span> <span className="font-semibold">{h.city}</span>
                <span className="block truncate text-xs text-muted-foreground">{h.source === "map" ? h.label : `${h.state}${h.district ? ` · ${h.district}` : ""}${h.hub_name ? ` · Hub: ${h.hub_name}` : ""}`}</span>
                {h.areas?.length ? <span className="block truncate text-xs text-muted-foreground">{h.areas.slice(0,3).join(" · ")}</span> : null}
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
