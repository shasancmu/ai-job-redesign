"use client";

import { useState } from "react";

// Client-safe shapes (no server types; the trap spoiler is never sent).
type Crit = { key: string; label: string; help: string };
type Tool = { name: string; description: string; destructive?: boolean };
type SpecField = { key: string; label: string; hint: string };
type Challenge = {
  id: string; title: string; brief: string; concept: string; passScore: number; rubric: Crit[];
  target?: string; starter?: string; goal?: string; tools?: Tool[]; spec_fields?: SpecField[]; build_target?: string;
};
type Sim = {
  kind: "prompt" | "agent" | "vibe"; slug: string; name: string; tagline: string; intro: string;
  concepts: string[]; transfer: string; takeaway: { title: string; body: string; template: string }; challenges: Challenge[];
};
type Grade = {
  score: number; criteria: { key: string; label: string; met: boolean; note: string }[];
  hiddenAssumptions?: string[]; safety?: string | null; strength: string; gap: string; passed: boolean;
};
type Artifact = any;

async function post(body: any) {
  const res = await fetch("/api/lab", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Failed");
  return d;
}

export default function AiLab({ sim, code, cohort }: { sim: Sim; code: string; cohort?: string | null }) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [idx, setIdx] = useState(0);
  const [system, setSystem] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [spec, setSpec] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ artifact: Artifact; grade: Grade } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bests, setBests] = useState<number[]>(sim.challenges.map(() => 0));
  const [transcript, setTranscript] = useState<{ speaker: string; text: string }[]>([]);
  const [byo, setByo] = useState("");
  const [byoSaved, setByoSaved] = useState(false);

  const ch = sim.challenges[idx];

  function resetInputs(c: Challenge) {
    setSystem(""); setUserPrompt(c.starter || ""); setTools((c.tools || []).map((t) => t.name)); setSpec({}); setResult(null); setErr(null);
  }
  function start() { setPhase("run"); resetInputs(sim.challenges[0]); }

  async function runAttempt() {
    setBusy(true); setErr(null);
    let input: any = {};
    if (sim.kind === "prompt") input = { system, user: userPrompt };
    else if (sim.kind === "agent") input = { system, enabledTools: tools };
    else input = { spec, prompt: userPrompt };
    try {
      const r = await post({ action: "run", sim: sim.slug, challengeId: ch.id, input });
      setResult(r);
      setBests((b) => b.map((x, i) => (i === idx ? Math.max(x, r.grade.score) : x)));
      const mine = sim.kind === "agent" ? `[policy] ${system}\n[tools] ${tools.join(", ")}` : sim.kind === "vibe" ? `[spec] ${Object.entries(spec).map(([k, v]) => `${k}: ${v}`).join("; ")}\n[prompt] ${userPrompt}` : `[system] ${system}\n[prompt] ${userPrompt}`;
      setTranscript((t) => [...t, { speaker: "human", text: `${ch.title}: ${mine}` }, { speaker: "ai", text: `Score ${r.grade.score}. ${r.grade.strength} Next: ${r.grade.gap}` }]);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  function next() {
    if (idx + 1 < sim.challenges.length) { const n = idx + 1; setIdx(n); resetInputs(sim.challenges[n]); }
    else finish();
  }

  async function record(withByo: boolean) {
    const final = Math.round(bests.reduce((a, b) => a + b, 0) / (bests.length || 1));
    const full = [...transcript];
    if (withByo && byo.trim()) full.push({ speaker: "human", text: `[my real task] ${byo}` });
    try { await post({ action: "finish", sim: sim.slug, code, cohort: cohort || undefined, transcript: full, score: final }); } catch { /* best-effort */ }
  }
  async function finish() { await record(false); setPhase("done"); }
  async function saveByo() { await record(true); setByoSaved(true); }

  const finalScore = Math.round(bests.reduce((a, b) => a + b, 0) / (bests.length || 1));

  // ---- intro ----
  if (phase === "intro") {
    return (
      <div className="space-y-5">
        <div>
          <div className="eyebrow">AI Skills Lab</div>
          <h1 className="mt-1 text-2xl font-bold text-ink">{sim.name}</h1>
          <p className="mt-2 text-slate2">{sim.intro}</p>
        </div>
        <div className="card p-5">
          <div className="text-sm font-semibold text-ink">You'll practice</div>
          <ul className="mt-2 space-y-1.5 text-sm text-slate2">
            {sim.concepts.map((c, i) => <li key={i} className="flex gap-2"><span className="text-ai">•</span>{c}</li>)}
          </ul>
        </div>
        <button onClick={start} className="btn-primary">Start · {sim.challenges.length} challenges</button>
      </div>
    );
  }

  // ---- done ----
  if (phase === "done") {
    const band = finalScore >= 80 ? "text-sage" : finalScore >= 60 ? "text-amber-600" : "text-clay";
    return (
      <div className="space-y-5">
        <div>
          <div className="eyebrow">Debrief</div>
          <h1 className="mt-1 text-2xl font-bold text-ink">{sim.name} complete</h1>
          <p className="mt-1 text-slate2">Competence across the challenges: <b className={band}>{finalScore}</b>/100.</p>
        </div>
        <div className="card p-5">
          <div className="text-sm font-semibold text-ink">What you now understand</div>
          <ul className="mt-2 space-y-1.5 text-sm text-slate2">
            {sim.concepts.map((c, i) => <li key={i} className="flex gap-2"><span className="text-sage">✓</span>{c}</li>)}
          </ul>
        </div>
        <div className="card p-5">
          <div className="text-sm font-semibold text-ink">{sim.takeaway.title}</div>
          <p className="mt-1 text-sm text-slate2">{sim.takeaway.body}</p>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-slate-50 p-3 text-xs text-ink">{sim.takeaway.template}</pre>
          <button onClick={() => navigator.clipboard?.writeText(sim.takeaway.template).catch(() => {})} className="btn-ghost mt-2 text-sm">Copy the template</button>
        </div>
        <div className="rounded-2xl border border-ai/30 bg-ai/5 p-5">
          <div className="text-sm font-semibold text-ink">Transfer it — your real task</div>
          <p className="mt-1 text-sm text-slate2">{sim.transfer}</p>
          <textarea className="field mt-3 min-h-[80px]" value={byo} onChange={(e) => { setByo(e.target.value); setByoSaved(false); }} placeholder="Describe a real task from your own work. Apply the kit above to it here." />
          <button onClick={saveByo} disabled={!byo.trim() || byoSaved} className="btn-ghost mt-2 text-sm">{byoSaved ? "Saved ✓" : "Save my task"}</button>
        </div>
      </div>
    );
  }

  // ---- run ----
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{sim.name}</span>
        <span>Challenge {idx + 1} of {sim.challenges.length}</span>
      </div>

      <div>
        <h2 className="text-xl font-bold text-ink">{ch.title}</h2>
        <p className="mt-2 text-slate2">{ch.brief}</p>
        <p className="mt-2 text-xs text-slate-500"><b>The idea:</b> {ch.concept}</p>
      </div>

      {/* Scored-on rubric */}
      <div className="rounded-xl border border-line bg-slate-50/60 p-3 text-xs">
        <div className="font-semibold text-ink">You'll be scored on</div>
        <ul className="mt-1 space-y-0.5 text-slate2">{ch.rubric.map((r) => <li key={r.key}>• {r.label} <span className="text-slate-400">— {r.help}</span></li>)}</ul>
      </div>

      {/* Kind-specific input */}
      {sim.kind === "prompt" && (
        <div className="space-y-3">
          {ch.target && <p className="text-xs text-slate-500"><b>Target output:</b> {ch.target}</p>}
          <div>
            <label className="lbl">System / role <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea className="field min-h-[60px]" value={system} onChange={(e) => setSystem(e.target.value)} placeholder="Only if a role changes the output" />
          </div>
          <div>
            <label className="lbl">Your prompt</label>
            <textarea className="field min-h-[120px]" value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} />
          </div>
        </div>
      )}

      {sim.kind === "agent" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500"><b>Goal:</b> {ch.goal}</p>
          <div>
            <label className="lbl">Tools you grant the agent</label>
            <div className="mt-1 space-y-1.5">
              {(ch.tools || []).map((t) => (
                <label key={t.name} className="flex items-start gap-2 text-sm text-ink">
                  <input type="checkbox" checked={tools.includes(t.name)} onChange={(e) => setTools((cur) => e.target.checked ? [...cur, t.name] : cur.filter((x) => x !== t.name))} className="mt-1 h-4 w-4 accent-[color:var(--ink)]" />
                  <span><span className="font-mono text-xs">{t.name}</span>{t.destructive && <span className="ml-1 rounded bg-clay/15 px-1 text-[10px] font-semibold text-clay">irreversible</span>} <span className="text-slate-500">— {t.description}</span></span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="lbl">Operator policy <span className="font-normal text-slate-400">(the agent's system prompt: rules, approvals, stopping conditions)</span></label>
            <textarea className="field min-h-[130px]" value={system} onChange={(e) => setSystem(e.target.value)} placeholder="How should it behave? When must it ask before acting? How does it treat what a tool returns?" />
          </div>
        </div>
      )}

      {sim.kind === "vibe" && (
        <div className="space-y-3">
          {ch.build_target && <p className="text-xs text-slate-500"><b>What good looks like:</b> {ch.build_target}</p>}
          {(ch.spec_fields || []).map((f) => (
            <div key={f.key}>
              <label className="lbl">{f.label}</label>
              <input className="field" value={spec[f.key] || ""} onChange={(e) => setSpec((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.hint} />
            </div>
          ))}
          <div>
            <label className="lbl">Your build prompt</label>
            <textarea className="field min-h-[100px]" value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} placeholder="Describe the one screen to build, using your spec" />
          </div>
        </div>
      )}

      {err && <p className="text-sm text-clay">{err}</p>}
      <button onClick={runAttempt} disabled={busy} className="btn-primary">{busy ? "Running…" : result ? "Run again" : "Run"}</button>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {sim.kind === "prompt" && (
            <div className="card p-4"><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Model output</div><div className="whitespace-pre-wrap text-sm text-ink">{result.artifact.output}</div></div>
          )}
          {sim.kind === "agent" && (
            <div className="card p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Agent trace</div>
              <div className="space-y-1.5 text-sm">
                {result.artifact.trace.filter((s: any) => s.type !== "observation").map((s: any, i: number) => (
                  <div key={i} className="flex gap-2">
                    <span className={`shrink-0 text-[10px] font-semibold uppercase ${s.type === "tool" ? "text-ai" : s.type === "ask" ? "text-amber-600" : s.type === "finish" ? "text-sage" : "text-slate-400"}`}>{s.type}</span>
                    <span className="text-ink">{s.type === "tool" ? <span><span className="font-mono text-xs">{s.tool}({s.input})</span> <span className="text-slate-500">→ {s.result}</span></span> : s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sim.kind === "vibe" && (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-xl border border-line">
                {/* allow-scripts (without allow-same-origin) runs any JS the model
                    still emits in an isolated opaque origin; the generator is told
                    to emit static HTML so this is only a safety net. */}
                <iframe title="preview" srcDoc={result.artifact.html} sandbox="allow-scripts" className="h-80 w-full bg-white" />
              </div>
              {result.artifact.assumptions?.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs">
                  <div className="font-semibold text-amber-800">Assumptions the AI made (that you didn't specify)</div>
                  <ul className="mt-1 space-y-0.5 text-amber-900">{result.artifact.assumptions.map((a: string, i: number) => <li key={i}>• {a}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {/* Feedback */}
          <div className={`rounded-xl border p-4 ${result.grade.passed ? "border-sage/40 bg-sage/5" : "border-line bg-white"}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-ink">Score {result.grade.score}/100 <span className="text-slate-400">(pass {ch.passScore})</span></div>
              {result.grade.passed && <span className="rounded bg-sage/15 px-2 py-0.5 text-xs font-semibold text-sage">passed</span>}
            </div>
            {result.grade.safety && <p className="mt-2 rounded bg-clay/10 px-2 py-1 text-xs text-clay"><b>Safety:</b> {result.grade.safety}</p>}
            <ul className="mt-2 space-y-1 text-xs">
              {result.grade.criteria.map((c) => (
                <li key={c.key} className="flex gap-2"><span className={c.met ? "text-sage" : "text-slate-300"}>{c.met ? "✓" : "○"}</span><span className="text-slate2"><b className="text-ink">{c.label}.</b> {c.note}</span></li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate2"><b className="text-ink">Do next:</b> {result.grade.gap}</p>
          </div>

          <button onClick={next} className="btn-primary">{idx + 1 < sim.challenges.length ? (result.grade.passed ? "Next challenge →" : "Move on anyway →") : "Finish & get your kit →"}</button>
          {!result.grade.passed && <p className="text-center text-xs text-slate-400">Tip: fix the one thing above and run again to raise your score before moving on.</p>}
        </div>
      )}
    </div>
  );
}
