import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Download, FileSpreadsheet, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Col<T> = { key: keyof T & string; label: string; render?: (row: T) => ReactNode; width?: string };

/** Spreadsheet-style table: search, per-column filter, sort, row select, CSV + Excel export. */
export function DataGrid<T extends Record<string, unknown>>({ rows, cols, name, rowKey, actions }: { rows: T[]; cols: Col<T>[]; name: string; rowKey: (r: T) => string; actions?: (selected: T[]) => ReactNode }) {
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const size = 50;
  const text = (v: unknown) => (v == null ? "" : String(v));
  const view = useMemo(() => {
    const s = q.trim().toLowerCase();
    let out = rows.filter((r) => (!s || cols.some((c) => text(r[c.key]).toLowerCase().includes(s))) && Object.entries(filters).every(([k, f]) => !f || text(r[k]).toLowerCase().includes(f.toLowerCase())));
    if (sort) out = [...out].sort((a, b) => text(a[sort.key]).localeCompare(text(b[sort.key]), undefined, { numeric: true }) * sort.dir);
    return out;
  }, [rows, cols, q, filters, sort]);
  const pages = Math.max(1, Math.ceil(view.length / size));
  const shown = view.slice(page * size, page * size + size);
  const selected = view.filter((r) => sel.has(rowKey(r)));
  const exportRows = selected.length ? selected : view;
  const matrix = () => [cols.map((c) => c.label), ...exportRows.map((r) => cols.map((c) => text(r[c.key])))];
  const csv = () => {
    const body = matrix().map((l) => l.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFF" + body], { type: "text/csv" })); a.download = `${name}.csv`; a.click();
  };
  const xlsx = async () => {
    const X = await import("xlsx");
    const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(matrix()), name.slice(0, 30)); X.writeFile(wb, `${name}.xlsx`);
  };
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border bg-background px-3"><Search className="h-4 w-4 opacity-60" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search all columns" aria-label="Search table" className="h-9 w-full bg-transparent text-sm outline-none" /></div>
        <span className="text-xs text-muted-foreground">{view.length} rows{selected.length ? ` · ${selected.length} selected` : ""}</span>
        {actions?.(selected)}
        <Button size="sm" variant="outline" onClick={csv}><Download />CSV</Button>
        <Button size="sm" variant="outline" onClick={xlsx}><FileSpreadsheet />Excel</Button>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-secondary">
            <tr>
              <th className="w-10 border-b border-r p-2"><input type="checkbox" aria-label="Select all" checked={!!view.length && selected.length === view.length} onChange={(e) => setSel(e.target.checked ? new Set(view.map(rowKey)) : new Set())} /></th>
              {cols.map((c) => (
                <th key={c.key} style={{ minWidth: c.width }} className="border-b border-r p-0 text-left align-top font-semibold">
                  <button className="flex w-full items-center gap-1 px-2 py-2 text-xs uppercase tracking-wide" onClick={() => setSort((s) => s?.key === c.key ? (s.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 })}>
                    {c.label}{sort?.key === c.key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                </th>))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => { const k = rowKey(r); return (
              <tr key={k} className={`${sel.has(k) ? "bg-primary/10" : i % 2 ? "bg-muted/40" : ""} hover:bg-secondary`}>
                <td className="border-b border-r p-2 text-center"><input type="checkbox" aria-label="Select row" checked={sel.has(k)} onChange={() => setSel((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; })} /></td>
                {cols.map((c) => <td key={c.key} className="whitespace-nowrap border-b border-r px-2 py-1.5">{c.render ? c.render(r) : text(r[c.key])}</td>)}
              </tr>); })}
          </tbody>
        </table>
        {!view.length && <p className="p-10 text-center text-muted-foreground">No rows match.</p>}
      </div>
      {pages > 1 && <div className="flex items-center justify-end gap-2 border-t p-2 text-xs"><Button size="sm" variant="ghost" disabled={!page} onClick={() => setPage((p) => p - 1)}>Prev</Button>Page {page + 1} / {pages}<Button size="sm" variant="ghost" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button></div>}
    </div>
  );
}
