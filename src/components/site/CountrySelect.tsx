import { useMemo, useRef, useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { allCountries, searchCountries } from "@/lib/countries";

/** Type-to-search country picker with flags; matches name, ISO code (US, UAE) or dialing code (+1). */
export function CountrySelect({ value, onChange, label, options }: { value: string; onChange: (name: string) => void; label: string; options?: string[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const pool = useMemo(() => {
    if (!options?.length) return allCountries();
    const all = allCountries(), wanted = new Set(options.map((o) => o.toLowerCase()));
    const alias: Record<string, string> = { "united states of america": "united states", usa: "united states", uk: "united kingdom", uae: "united arab emirates" };
    const found = all.filter((c) => wanted.has(c.name.toLowerCase()) || [...wanted].some((w) => alias[w] === c.name.toLowerCase()));
    // Options that the flag list doesn't know still appear (globe icon) so nothing silently disappears.
    const known = new Set(found.map((c) => c.name.toLowerCase()));
    const extra = options.filter((o) => !known.has(o.toLowerCase()) && !found.some((c) => alias[o.toLowerCase()] === c.name.toLowerCase())).map((o) => ({ code: o.slice(0, 2).toUpperCase(), name: o, dial: "", flag: "🌐" }));
    return [...found, ...extra];
  }, [options]);
  const list = useMemo(() => searchCountries(q, pool).slice(0, 80), [q, pool]);
  const current = useMemo(() => pool.find((c) => c.name === value) ?? allCountries().find((c) => c.name === value), [value, pool]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const pick = (name: string) => { onChange(name); setOpen(false); setQ(""); };
  return (
    <div ref={ref} className="relative mt-1">
      <div className="flex h-11 w-full items-center gap-2 rounded-md border bg-card px-3 text-sm font-normal focus-within:ring-2 focus-within:ring-ring">
        {!open && current && <span className="text-lg">{current.flag}</span>}
        <input
          aria-label={label} role="combobox" aria-expanded={open} autoComplete="off"
          value={open ? q : current ? current.name : ""}
          placeholder={current ? `${current.flag} ${current.name}` : "Type country, code (US) or +1"}
          onFocus={() => { setOpen(true); setActive(0); }}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if ((e.key === "Enter" || (e.key === "Tab" && q)) && open && list[active]) { if (e.key === "Enter") e.preventDefault(); pick(list[active]!.name); }
            else if (e.key === "Escape") { setOpen(false); setQ(""); }
          }}
          className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {!open && current && <span className="text-xs text-muted-foreground">{current.code} {current.dial}</span>}
        <ChevronDown className="h-4 w-4 opacity-60" />
      </div>
      {open && (
        <ul role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover py-1 shadow-lg">
          {list.map((c, i) => (
            <li key={c.name}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c.name)} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-normal hover:bg-secondary ${i === active || c.name === value ? "bg-secondary" : ""}`}><span className="text-lg">{c.flag}</span><span className="flex-1">{c.name}</span><span className="text-xs text-muted-foreground">{c.code}{c.dial ? ` · ${c.dial}` : ""}</span></button></li>
          ))}
          {!list.length && <li className="px-3 py-3 text-sm text-muted-foreground">No country matches “{q}”</li>}
        </ul>
      )}
    </div>
  );
}
