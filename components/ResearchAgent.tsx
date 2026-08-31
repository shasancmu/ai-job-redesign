"use client";

import { useState } from "react";

type Result = {
  intent: string; restate: string; answer: string;
  evidence:
    | { kind: "experts"; items: { name: string; org: string; compot: number; scipot: number; subfields?: string }[] }
    | { kind: "impact"; scores: Record<string, number> }
    | { kind: "papers"; items: { title: string; year?: number; compot: number; authors?: string }[] }
    | { kind: "none" };
};

const EXAMPLES = [
  "Who at Duke should I collaborate with on solid-state batteries?",
  "Map the field of CRISPR gene editing — who leads it and where is it heading?",
  "Score this idea: a low-cost microfluidic device for rapid sepsis diagnosis from a single drop of blood.",
];

const POT_LABEL: Record<string, string> = { commercial: "Commercial", scientific: "Scientific", social: "Social", defense: "Defense", interdisciplinary: "Interdisc.", complex_invention: "Complex" };

export default function ResearchAgent() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);

  async function ask(question?: string) {
    const text = (question ?? q).trim();
    if (text.length < 4) return;
    if (question) setQ(question);
    setBusy(true); setErr(null); setRes(null);
    try {
      const r = await fetch("/api/scientifiq/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text }) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "The agent couldn't answer."); setBusy(false); return; }
      setRes(j);
    } catch { setErr("Couldn't reach the agent."); }
    setBusy(false);
  }

  return (
    <div>
      <div className="rounded-2xl border border-line bg-white p-4">
        <textarea className="field min-h-[90px]" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about the research ecosystem — find collaborators, score an idea, or map a field. For scoring, paste the abstract." />
        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => ask()} disabled={busy || q.trim().length < 4} className="btn-primary disabled:opacity-40">{busy ? "Thinking…" : "Ask →"}</button>
          {res && <span className="text-xs text-slate-400">routed to <b className="text-slate2">{res.intent}</b></span>}
        </div>
      </div>

      {!res && !busy && (
        <div className="mt-4 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Try</div>
          {EXAMPLES.map((e) => (
            <button key={e} onClick={() => ask(e)} className="block w-full rounded-lg border border-line bg-mist px-3 py-2 text-left text-sm text-slate-600 hover:bg-white">{e}</button>
          ))}
        </div>
      )}

      {err && <p className="mt-3 text-sm text-clay">{err}</p>}

      {res && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{res.answer}</div>
          </div>

          {res.evidence.kind === "experts" && res.evidence.items.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Experts (from Scientifiq)</div>
              <ul className="space-y-1.5">
                {res.evidence.items.map((e, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                    <span><span className="font-semibold text-ink">{e.name}</span>{e.org ? <span className="text-slate2"> · {e.org}</span> : null}</span>
                    <span className="shrink-0 text-xs text-slate-400 tabular-nums">comm {e.compot} · sci {e.scipot}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {res.evidence.kind === "impact" && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Potential scores</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(res.evidence.scores).filter(([, v]) => v >= 0).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-line p-2.5">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">{POT_LABEL[k] || k}</div>
                    <div className="text-lg font-bold text-ink">{v}<span className="text-xs text-slate-400">/100</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {res.evidence.kind === "papers" && res.evidence.items.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Standout work</div>
              <ul className="space-y-1.5">
                {res.evidence.items.map((p, i) => (
                  <li key={i} className="text-sm"><span className="font-medium text-ink">{p.title}</span>{p.year ? <span className="text-slate-400"> ({p.year})</span> : null}{p.authors ? <span className="text-slate2"> — {p.authors}</span> : null}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
