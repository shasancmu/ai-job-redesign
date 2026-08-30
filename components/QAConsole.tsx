"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mod = { slug: string; name: string };
type Note = { role: string; rating: number | null; friction: string[]; suggestions: string[]; one_thing: string; summary: string };
type Result = { slug: string; name: string; notes: Note[]; brief: string };

const ROLE_LABEL: Record<string, string> = { learner: "Basic learner", skeptic: "Skeptic", struggling: "Struggling", expert: "Expert", hurried: "Hurried mobile" };

export default function QAConsole({ modules }: { modules: Mod[] }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const shown = q ? modules.filter((m) => m.name.toLowerCase().includes(q.toLowerCase())) : modules;
  const toggle = (slug: string) => setSel((s) => { const n = new Set(s); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });

  async function run() {
    if (!sel.size) return;
    setRunning(true); setResults([]); setCopied(false);
    const picked = modules.filter((m) => sel.has(m.slug));
    const out: Result[] = [];
    for (let i = 0; i < picked.length; i++) {
      setProgress(`Running QA on ${picked[i].name} (${i + 1}/${picked.length})…`);
      try {
        const res = await fetch("/api/admin/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: picked[i].slug }) });
        const data = await res.json();
        if (res.ok) out.push({ slug: data.slug, name: data.name, notes: data.notes || [], brief: data.brief || "" });
      } catch { /* skip a failed module */ }
      setResults([...out]);
    }
    setProgress(""); setRunning(false);
    router.refresh();
  }

  const combinedBrief = results.map((r) => r.brief).join("\n\n---\n\n");

  return (
    <div>
      {/* Picker */}
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <input className="field flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter modules…" />
          <span className="shrink-0 text-xs text-slate-400">{sel.size} selected</span>
        </div>
        <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
          {shown.map((m) => (
            <label key={m.slug} className={"flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm " + (sel.has(m.slug) ? "border-ai bg-ai/5" : "border-transparent hover:bg-mist")}>
              <input type="checkbox" checked={sel.has(m.slug)} onChange={() => toggle(m.slug)} />
              <span className="truncate">{m.name}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={run} disabled={running || !sel.size} className="btn-dark text-sm">{running ? "Running…" : `▶ Run QA on ${sel.size || 0}`}</button>
          <button onClick={() => setSel(new Set(shown.map((m) => m.slug)))} className="text-xs text-sky hover:underline">Select all shown</button>
          <button onClick={() => setSel(new Set())} className="text-xs text-slate-400 hover:text-ink">Clear</button>
          {progress && <span className="text-xs text-slate2">{progress}</span>}
        </div>
        <p className="mt-2 text-xs text-slate-400">A five-persona panel (learner, skeptic, struggling, expert, hurried) runs each — ~1 min per module.</p>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="eyebrow">Findings</h2>
            <button
              onClick={() => { navigator.clipboard?.writeText(combinedBrief).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
              className="btn-dark text-sm"
            >{copied ? "Copied ✓" : "📋 Copy brief for Claude Code"}</button>
          </div>
          <div className="space-y-3">
            {results.map((r) => {
              const avg = r.notes.length ? (r.notes.reduce((s, n) => s + (n.rating || 0), 0) / r.notes.length).toFixed(1) : "—";
              return (
                <div key={r.slug} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-ink">{r.name}</div>
                    <span className="text-xs font-semibold text-amber-600">{avg}/5 · {r.notes.length} personas</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {r.notes.slice().sort((a, b) => (a.rating ?? 3) - (b.rating ?? 3)).map((n, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-semibold text-ink">{ROLE_LABEL[n.role] || n.role} ({n.rating}/5):</span>{" "}
                        <span className="text-slate2">{n.one_thing || n.summary}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
