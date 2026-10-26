import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BadgePercent, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getIntlMarkup, saveIntlMarkup } from "@/lib/intl-rates.functions";
import { fromSignedPercent, MAX_DISCOUNT_PCT, MAX_MARKUP_PCT, toSignedPercent, withMarkup, type AdjustMode } from "@/lib/intl-rates";

/** Admin: one price adjustment for every live international price — add a margin OR give a discount, never both. */
export function IntlMarkupControl({ compact = false }: { compact?: boolean }) {
  const get = useServerFn(getIntlMarkup), save = useServerFn(saveIntlMarkup);
  const [mode, setMode] = useState<AdjustMode>("markup");
  const [value, setValue] = useState(0);
  const [flat, setFlat] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { get().then((r) => { const s = fromSignedPercent(r.percent); setMode(s.mode); setValue(s.value); setFlat(r.flat); }).catch(() => {}); }, [get]);
  const max = mode === "discount" ? MAX_DISCOUNT_PCT : MAX_MARKUP_PCT;
  const signed = toSignedPercent(mode, value);
  const opts: [AdjustMode, string, typeof Plus][] = [["markup", "Add margin (+%)", Plus], ["discount", "Discount (−%)", Minus]];
  return (
    <div className={`rounded-2xl border bg-muted/40 text-sm ${compact ? "p-4" : "p-5"}`}>
      <p className="flex items-center gap-2 font-bold"><BadgePercent className="h-4 w-4 text-primary" />Price adjustment for live international prices</p>
      <p className="mt-1 text-xs text-muted-foreground">Pick one option. It is applied to every price the service returns before customers see it.</p>
      <div role="radiogroup" aria-label="Adjustment type" className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {opts.map(([k, l, I]) => (
          <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
            className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${mode === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            <I className="h-4 w-4" />{l}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold">{mode === "discount" ? "Discount %" : "Margin %"} (0–{max})
          <Input type="number" min={0} max={max} step="0.5" value={value} onChange={(e) => setValue(Math.min(max, Math.abs(+e.target.value || 0)))} className="mt-1" /></label>
        <label className="text-xs font-semibold">Extra flat ₹ (optional)
          <Input type="number" min={-100000} max={100000} value={flat} onChange={(e) => setFlat(+e.target.value || 0)} className="mt-1" /></label>
      </div>
      <p className="mt-2 rounded-lg bg-card p-2 text-xs">Example: service price ₹2,000 → customer pays <b>₹{withMarkup(2000, signed, flat).toLocaleString("en-IN")}</b></p>
      <Button type="button" size="sm" className="mt-3" disabled={busy} onClick={async () => {
        setBusy(true);
        try { await save({ data: { percent: signed, flat } }); toast.success(mode === "discount" ? `Discount of ${Math.abs(signed)}% saved` : `Margin of ${signed}% saved`); }
        catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
      }}>{busy ? "Saving…" : "Save adjustment"}</Button>
    </div>
  );
}
