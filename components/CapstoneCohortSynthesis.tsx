"use client";

import { useState } from "react";

type Strategy = { label: string; teams: string[]; gist: string };
type Synthesis = { overview: string; strategies: Strategy[]; what_worked: string; common_mistakes: string; aha: string };

export default function CapstoneCohortSynthesis({ cohort, teamCount }: { cohort: string; teamCount: number }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [s, setS] = useState<Synthesis | null>(null);

  async function run() {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/capstone/cohort", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cohort }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.synthesis) throw new Error(d.error || "Couldn't synthesize.");
      setS(d.synthesis);
    } catch (e: any) { setErr(e?.message || "Couldn't synthesize."); }
    finally { setBusy(false); }
  }

  if (!s) {
    return (
      <div className="rounded-2xl border border-line bg-gradient-to-br from-white to-mist p-5 text-center">
        <div className="text-sm font-semibold text-ink">Cross-team synthesis</div>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Read all {teamCount} teams at once: the range of strategies, what separated the clean from the caught, and the collective learning.</p>
        <button onClick={run} disabled={busy || teamCount === 0} className="btn-primary mt-3 text-sm disabled:opacity-50">{busy ? "Reading the room..." : "✨ Synthesize the cohort"}</button>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cross-team synthesis</div>
        <button onClick={run} disabled={busy} className="text-xs text-slate-400 hover:text-ink">{busy ? "..." : "Re-run"}</button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink">{s.overview}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(s.strategies || []).map((st, i) => (
          <div key={i} className="rounded-xl bg-mist p-3">
            <div className="text-sm font-bold text-ink">{st.label}</div>
            <div className="mt-0.5 text-[11px] font-mono text-slate-400">{(st.teams || []).join(", ")}</div>
            <div className="mt-1 text-xs leading-snug text-slate-600">{st.gist}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border-l-2 border-sage pl-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">What the strong teams did</div>
          <p className="mt-1 text-sm leading-snug text-slate-700">{s.what_worked}</p>
        </div>
        <div className="rounded-xl border-l-2 border-clay pl-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-clay">Common mistakes</div>
          <p className="mt-1 text-sm leading-snug text-slate-700">{s.common_mistakes}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-ink p-4 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/50">The learning to leave with</div>
        <p className="mt-1 text-sm leading-relaxed text-white/90">{s.aha}</p>
      </div>
    </div>
  );
}
