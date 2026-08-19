"use client";

import { useCallback, useEffect, useState } from "react";
import { EXPERIMENT_FLOWS, METRICS, TARGETS, flowLabel } from "@/lib/experiments";

async function api(action: string, extra: any = {}) {
  const res = await fetch("/api/experiments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
  return res.json();
}

export default function ExperimentsBoard() {
  const [exps, setExps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposeFlow, setProposeFlow] = useState<string>(EXPERIMENT_FLOWS[0].key);
  const [draft, setDraft] = useState<any>(null);
  const [busy, setBusy] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await api("list");
    setExps(d.experiments || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function propose() {
    setBusy("propose"); setErr(null); setDraft(null);
    const d = await api("propose", { flow: proposeFlow });
    if (d.draft) setDraft({ ...d.draft, flow: proposeFlow, target: "interview", mode: "human" });
    else setErr(d.error || "Couldn't propose.");
    setBusy("");
  }
  async function create() {
    setBusy("create"); setErr(null);
    const d = await api("create", { ...draft, created_by: "agent" });
    if (d.experiment) { setDraft(null); await load(); }
    else setErr(d.error || "Couldn't save.");
    setBusy("");
  }
  async function act(id: string, action: string) {
    setBusy(id + action); setErr(null);
    const d = await api(action, { id });
    if (d.error) setErr(d.error);
    else if (action === "analyze" || action === "simulate") setExps((xs) => xs.map((e) => (e.id === id ? { ...e, analysis: d.analysis, _narrative: d.narrative } : e)));
    else await load();
    setBusy("");
  }

  function exportCsv() {
    const head = ["name", "flow", "metric", "status", "hypothesis", "arm", "n", "successes", "rate", "p_value", "conclusive"];
    const lines = [head.join(",")];
    for (const e of exps) {
      const a = e.analysis;
      for (const arm of a?.arms || [{}]) {
        lines.push([e.name, e.flow, e.metric, e.status, e.hypothesis, arm.label || "", arm.n ?? "", arm.successes ?? "", arm.rate != null ? arm.rate.toFixed(3) : "", a?.pValue != null ? a.pValue.toFixed(3) : "", a?.conclusive ?? ""].map(csv).join(","));
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "experiments.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const byStatus = (s: string[]) => exps.filter((e) => s.includes(e.status));
  const proposed = byStatus(["proposed"]);
  const running = byStatus(["running"]);
  const done = byStatus(["adopted", "rejected", "concluded"]);

  return (
    <div className="space-y-8">
      {/* Propose */}
      <div className="card p-5">
        <div className="text-sm font-bold text-ink">Ask the agent for an experiment</div>
        <p className="mt-1 text-xs text-slate-400">It proposes one subtle change to an interview and how to measure it. Nothing goes live until you launch it.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={proposeFlow} onChange={(e) => setProposeFlow(e.target.value)} className="field w-auto text-sm">
            {EXPERIMENT_FLOWS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <button onClick={propose} disabled={busy === "propose"} className="btn-primary text-sm">{busy === "propose" ? "Thinking…" : "✨ Propose an experiment"}</button>
        </div>
        {err && <p className="mt-2 text-sm text-clay">{err}</p>}

        {draft && (
          <div className="mt-4 rounded-2xl border border-line bg-mist/50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Draft · {flowLabel(draft.flow)}</div>
            <input className="field mt-1 font-semibold" value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <textarea className="field mt-2 min-h-[52px] text-sm" value={draft.hypothesis || ""} onChange={(e) => setDraft({ ...draft, hypothesis: e.target.value })} />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-slate-500">What it changes
                <select className="field mt-1 text-sm" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })}>
                  {TARGETS.map((t) => <option key={t.key} value={t.key}>{t.label} ({t.help})</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-500">Subjects
                <select className="field mt-1 text-sm" value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value })}>
                  <option value="human">Real people (live A/B)</option>
                  <option value="synthetic">AI personas (synthetic, directional)</option>
                </select>
              </label>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <label className="text-xs text-slate-500">Metric
                <select className="field mt-1 text-sm" value={draft.metric} onChange={(e) => setDraft({ ...draft, metric: e.target.value })}>
                  {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-500">Sample / arm
                <input type="number" className="field mt-1 text-sm" value={draft.min_per_arm || 100} onChange={(e) => setDraft({ ...draft, min_per_arm: Number(e.target.value) })} />
              </label>
              <label className="text-xs text-slate-500">Treatment label
                <input className="field mt-1 text-sm" value={draft.treatmentLabel || ""} onChange={(e) => setDraft({ ...draft, treatmentLabel: e.target.value })} />
              </label>
            </div>
            <label className="mt-2 block text-xs text-slate-500">The subtle change (appended to the interviewer&apos;s prompt)
              <textarea className="field mt-1 min-h-[52px] text-sm" value={draft.treatmentNudge || ""} onChange={(e) => setDraft({ ...draft, treatmentNudge: e.target.value })} />
            </label>
            <div className="mt-3 flex gap-2">
              <button onClick={create} disabled={busy === "create"} className="btn-primary text-sm">{busy === "create" ? "Saving…" : "Save as proposed"}</button>
              <button onClick={() => setDraft(null)} className="btn-ghost text-sm">Discard</button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl bg-mist px-4 py-5 text-sm text-slate2">Loading…</div>
      ) : (
        <>
          <Group title="Proposed" empty="No proposals yet. Ask the agent above.">
            {proposed.map((e) => <Card key={e.id} e={e} busy={busy} act={act} />)}
          </Group>
          <Group title="Running" empty="Nothing live yet. Launch a proposal to start collecting data.">
            {running.map((e) => <Card key={e.id} e={e} busy={busy} act={act} />)}
          </Group>
          {done.length > 0 && (
            <Group title="Concluded" empty="">
              {done.map((e) => <Card key={e.id} e={e} busy={busy} act={act} />)}
            </Group>
          )}
          <button onClick={exportCsv} className="btn-ghost text-sm">↧ Export all as CSV</button>
        </>
      )}
    </div>
  );
}

function Group({ title, empty, children }: { title: string; empty: string; children: any }) {
  const has = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div>
      <h2 className="eyebrow mb-2">{title}</h2>
      {has ? <div className="space-y-3">{children}</div> : empty ? <div className="rounded-xl bg-mist px-4 py-4 text-sm text-slate-400">{empty}</div> : null}
    </div>
  );
}

function Card({ e, busy, act }: { e: any; busy: string; act: (id: string, action: string) => void }) {
  const a = e.analysis;
  const treatment = (e.variants || []).find((v: any) => v.key === "treatment");
  const metricLabel = METRICS.find((m) => m.key === e.metric)?.label || e.metric;
  const minN = a ? Math.min(...(a.arms || []).map((x: any) => x.n)) : 0;
  const pct = a ? Math.min(100, Math.round((minN / (a.minPerArm || 1)) * 100)) : 0;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink">{e.name}</span>
            <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate-500">{flowLabel(e.flow)}</span>
            <StatusChip status={e.status} conclusive={a?.conclusive} />
          </div>
          <p className="mt-1 text-sm text-slate2">{e.hypothesis}</p>
        </div>
        <div className="shrink-0 text-right text-[11px] text-slate-400">
          <div>{metricLabel}</div>
          <div>{e.target === "report" ? "report copy" : "interview"}{e.mode === "synthetic" ? " · synthetic" : ""}</div>
        </div>
      </div>

      {treatment?.nudge && (
        <div className="mt-2 rounded-lg bg-mist px-3 py-2 text-xs text-slate-600"><b className="text-ink">Treatment:</b> {treatment.nudge}</div>
      )}

      {a && (
        <div className="mt-3">
          <div className="space-y-1.5">
            {(a.arms || []).map((arm: any) => (
              <div key={arm.key} className="flex items-center gap-3">
                <div className="w-24 shrink-0 text-xs text-slate-600">{arm.label}</div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-ink" style={{ width: `${Math.round(arm.rate * 100)}%` }} />
                </div>
                <div className="w-28 shrink-0 text-right text-xs text-slate-500">{(arm.rate * 100).toFixed(1)}% · n={arm.n}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
            <span>Sample: {minN}/{a.minPerArm} per arm ({pct}%)</span>
            {a.pValue != null && <span>p = {a.pValue.toFixed(3)}</span>}
            {a.liftAbs != null && <span>lift {(a.liftAbs * 100).toFixed(1)} pts</span>}
            <span className={a.conclusive ? "font-semibold text-sage" : ""}>{a.conclusive ? "Conclusive" : a.reachedSample ? "No significant difference" : "Collecting data"}</span>
          </div>
          {e._narrative && <p className="mt-2 rounded-lg bg-sky-soft/40 px-3 py-2 text-sm text-slate-700">{e._narrative}</p>}
          {e.mode === "synthetic" && <p className="mt-1 text-[11px] text-amber">Synthetic estimate from AI personas, directional only. Promote to a live test to confirm on real people.</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {e.mode === "synthetic" ? (
          <>
            <button onClick={() => act(e.id, "simulate")} disabled={!!busy} className="btn-ghost text-sm">{busy === e.id + "simulate" ? "Simulating…" : a ? "↻ Re-run simulation" : "🧪 Run simulation"}</button>
            {a && <button onClick={() => act(e.id, "promote")} disabled={!!busy} className="btn-primary text-sm" title="Clone this as a live A/B test on real people">{busy === e.id + "promote" ? "Promoting…" : "→ Promote to live test"}</button>}
            {["proposed", "running"].includes(e.status) && <button onClick={() => act(e.id, "reject")} disabled={!!busy} className="btn-ghost text-sm">Discard</button>}
          </>
        ) : (
          <>
            {e.status === "proposed" && <button onClick={() => act(e.id, "launch")} disabled={!!busy} className="btn-primary text-sm">🚀 Launch</button>}
            {e.status === "running" && <>
              <button onClick={() => act(e.id, "analyze")} disabled={!!busy} className="btn-ghost text-sm">{busy === e.id + "analyze" ? "Analyzing…" : "↻ Analyze"}</button>
              <button onClick={() => act(e.id, "adopt")} disabled={!!busy} className="btn-primary text-sm">Adopt</button>
              <button onClick={() => act(e.id, "reject")} disabled={!!busy} className="btn-ghost text-sm">Reject</button>
            </>}
          </>
        )}
      </div>
    </div>
  );
}

function StatusChip({ status, conclusive }: { status: string; conclusive?: boolean }) {
  const map: Record<string, string> = {
    proposed: "bg-slate-100 text-slate-500",
    running: conclusive ? "bg-sage-soft text-sage" : "bg-amber-soft text-amber",
    adopted: "bg-sage-soft text-sage",
    rejected: "bg-clay-soft text-clay",
    concluded: "bg-slate-100 text-slate-500",
  };
  return <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + (map[status] || "bg-slate-100 text-slate-500")}>{status}</span>;
}

function csv(v: any): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
