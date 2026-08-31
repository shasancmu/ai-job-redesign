"use client";

import { useMemo, useState } from "react";

type Row = { id: string; commercial: number; scientific: number; social: number; interdisciplinary: number; complex_invention: number; defense?: number };
type Item = { id: string; text: string };

const COLS: { key: keyof Row; label: string }[] = [
  { key: "commercial", label: "Comm" }, { key: "scientific", label: "Sci" }, { key: "social", label: "Soc" },
  { key: "defense", label: "Defense" }, { key: "complex_invention", label: "Complex" }, { key: "interdisciplinary", label: "Interdisc" },
];

function cellColor(v: number): string {
  if (v < 0) return "transparent";
  const t = Math.max(0, Math.min(100, v)) / 100;
  const r = Math.round(192 + (63 - 192) * t), g = Math.round(106 + (122 - 106) * t), b = Math.round(71 + (82 - 71) * t);
  return `rgba(${r},${g},${b},${0.15 + t * 0.5})`;
}

// Minimal CSV parser (handles quoted fields with commas/newlines).
function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

function itemsFromCSV(text: string): Item[] {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  let absCol = header.findIndex((h) => h === "abstract" || h === "text");
  let idCol = header.findIndex((h) => h === "id" || h === "doi" || h === "title");
  let start = 1;
  if (absCol < 0) { // no header — assume widest column is the abstract
    start = 0;
    const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => (r[c] || "").length)));
    absCol = widths.indexOf(Math.max(...widths));
    idCol = -1;
  }
  return rows.slice(start).map((r, i) => ({ id: (idCol >= 0 ? r[idCol] : "") || String(i + 1), text: (r[absCol] || "").trim() }));
}

function itemsFromText(text: string): Item[] {
  const blocks = /^\s*---\s*$/m.test(text) ? text.split(/^\s*---\s*$/m) : text.split(/\n{2,}/);
  const parts = blocks.map((b) => b.trim()).filter((b) => b.length >= 80);
  return parts.map((t, i) => ({ id: String(i + 1), text: t }));
}

export default function BatchScore() {
  const [items, setItems] = useState<Item[]>([]);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sortKey, setSortKey] = useState<keyof Row>("defense");

  const parsed = items.length;

  async function onFile(f: File | null) {
    if (!f) return;
    const text = await f.text();
    const it = f.name.toLowerCase().endsWith(".csv") ? itemsFromCSV(text) : itemsFromText(text);
    setItems(it.slice(0, 50)); setRows(null); setErr(it.length ? null : "Couldn't find abstracts in that file.");
  }
  function usePaste() { const it = itemsFromText(pasted).slice(0, 50); setItems(it); setRows(null); setErr(it.length ? null : "Paste abstracts separated by a blank line or a line of ---."); }

  async function run() {
    if (!items.length) return;
    setBusy(true); setErr(null); setRows(null);
    try {
      const res = await fetch("/api/scientifiq/batch-score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Batch scoring failed."); setBusy(false); return; }
      setRows(j.rows);
    } catch { setErr("Couldn't reach the scorer."); }
    setBusy(false);
  }

  const sorted = useMemo(() => rows ? [...rows].sort((a, b) => ((b[sortKey] as number) ?? -1) - ((a[sortKey] as number) ?? -1)) : null, [rows, sortKey]);

  function downloadCSV() {
    if (!rows) return;
    const cols = ["id", ...COLS.map((c) => c.key)];
    const esc = (v: any) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc((r as any)[c] === -1 ? "" : (r as any)[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "impact_scores.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="lbl">Upload CSV or text</label>
            <input type="file" accept=".csv,.txt" onChange={(e) => onFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-white" />
            <p className="mt-1 text-xs text-slate-400">CSV with an <b>abstract</b> column (and optional <b>id</b>/<b>doi</b>), or a .txt of abstracts.</p>
          </div>
          <div>
            <label className="lbl">…or paste</label>
            <textarea className="field min-h-[70px]" value={pasted} onChange={(e) => setPasted(e.target.value)} onBlur={usePaste} placeholder="Abstracts separated by a blank line or a line of ---" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={run} disabled={busy || !parsed} className="btn-primary disabled:opacity-40">{busy ? "Scoring…" : `Score ${parsed || 0} paper${parsed === 1 ? "" : "s"} →`}</button>
          <span className="text-xs text-slate-400">{parsed} loaded{parsed >= 50 ? " (max 50)" : ""}</span>
          {err && <span className="text-sm text-clay">{err}</span>}
        </div>
      </div>

      {sorted && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="eyebrow">Impact fingerprints — {sorted.length} papers</h2>
            <button onClick={downloadCSV} className="btn-dark text-sm">⭳ Download CSV</button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-mist text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 text-left font-semibold">Paper</th>
                  {COLS.map((c) => (
                    <th key={c.key} className="cursor-pointer px-2 py-2 text-center font-semibold hover:text-ink" onClick={() => setSortKey(c.key)}>
                      {c.label}{sortKey === c.key ? " ▾" : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={i} className={i ? "border-t border-line-soft" : ""}>
                    <td className="max-w-[220px] truncate px-3 py-1.5 text-ink" title={r.id}>{r.id}</td>
                    {COLS.map((c) => {
                      const v = (r as any)[c.key];
                      return <td key={c.key} className="px-2 py-1.5 text-center tabular-nums" style={{ background: cellColor(v) }}>{v == null || v < 0 ? "—" : v}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-400">Each cell 0–100. Sort by any column to surface, e.g., the highest defense or interdisciplinary potential in a batch.</p>
        </div>
      )}
    </div>
  );
}
