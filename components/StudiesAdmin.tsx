"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// Types only — lib/studies is server-only (it imports the admin client).
import type { Study, StudyCohort, StudyResult } from "@/lib/studies";

async function post(body: any) {
  const res = await fetch("/api/admin/studies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Failed");
  return d;
}

export default function StudiesAdmin({ studies, cohortsByStudy, results }: {
  studies: Study[];
  cohortsByStudy: Record<string, StudyCohort[]>;
  results: Record<string, StudyResult | null>;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      {!creating ? (
        <button onClick={() => setCreating(true)} className="btn-primary text-sm">New study</button>
      ) : (
        <CreateForm onDone={() => { setCreating(false); router.refresh(); }} onCancel={() => setCreating(false)} />
      )}

      {studies.length === 0 && !creating && <p className="text-sm text-slate2">No studies yet.</p>}

      {studies.map((s) => (
        <StudyCard key={s.id} study={s} cohorts={cohortsByStudy[s.id] || []} result={results[s.id] || null} onChange={() => router.refresh()} />
      ))}
    </div>
  );
}

function CreateForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [design, setDesign] = useState<"cluster" | "stepped_wedge">("cluster");
  const [intake, setIntake] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true); setErr(null);
    try { await post({ action: "create", name, slug, design, intake_code: intake || undefined }); onDone(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="lbl">Name</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Duke exec — negotiation cohort RCT" />
        </div>
        <div>
          <label className="lbl">Slug</label>
          <input className="field" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="duke-neg-2026" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="lbl">Design</label>
          <select className="field" value={design} onChange={(e) => setDesign(e.target.value as any)}>
            <option value="cluster">Cluster (cohorts → condition)</option>
            <option value="stepped_wedge">Stepped-wedge (cohorts → waves)</option>
          </select>
        </div>
        <div>
          <label className="lbl">Intake code <span className="font-normal text-slate-400">(optional — randomizes joiners into cohorts)</span></label>
          <input className="field font-mono" value={intake} onChange={(e) => setIntake(e.target.value.toUpperCase())} placeholder="DUKE-NEG" />
        </div>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy || !name || !slug} className="btn-primary text-sm">{busy ? "Creating…" : "Create"}</button>
        <button onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
      </div>
    </div>
  );
}

function StudyCard({ study, cohorts, result, onChange }: { study: Study; cohorts: StudyCohort[]; result: StudyResult | null; onChange: () => void }) {
  const [codes, setCodes] = useState("");
  const [arms, setArms] = useState("treatment, control");
  const [waves, setWaves] = useState("3");
  const [start, setStart] = useState("");
  const [interval, setInterval] = useState("14");
  const [plan, setPlan] = useState((study.plan as any)?.text || "");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(action: string, extra: any = {}) {
    setBusy(action); setErr(null);
    try { await post({ action, id: study.id, ...extra }); onChange(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  const cluster = study.design === "cluster";

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-bold text-ink">{study.name}</div>
          <div className="text-xs text-slate-400">
            {study.slug} · {cluster ? "cluster" : "stepped-wedge"} · <span className={study.status === "running" ? "text-sage font-semibold" : ""}>{study.status}</span>
            {study.intake_code && <> · intake <span className="font-mono">{study.intake_code}</span></>}
            {study.preregistered_at && <> · pre-registered {new Date(study.preregistered_at).toLocaleDateString()}</>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {study.status !== "running" && <button onClick={() => run("status", { status: "running" })} disabled={!!busy || cohorts.length === 0} className="btn-primary text-xs">Start</button>}
          {study.status === "running" && <button onClick={() => run("status", { status: "concluded" })} disabled={!!busy} className="btn-ghost text-xs">Conclude</button>}
        </div>
      </div>

      {/* Frozen assignment */}
      {cohorts.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-line text-left text-slate-500">
              <th className="px-3 py-2 font-semibold">Cohort</th>
              <th className="px-3 py-2 font-semibold">{cluster ? "Condition" : "Wave"}</th>
              {!cluster && <th className="px-3 py-2 font-semibold">Treatment unlocks</th>}
            </tr></thead>
            <tbody>
              {cohorts.slice().sort((a, b) => a.cohort_code.localeCompare(b.cohort_code)).map((c) => (
                <tr key={c.cohort_code} className="border-b border-line/50 last:border-0">
                  <td className="px-3 py-2 font-mono text-ink">{c.cohort_code}</td>
                  <td className="px-3 py-2 text-slate2">{cluster ? (c.condition || "—") : `wave ${c.wave}`}</td>
                  {!cluster && <td className="px-3 py-2 text-slate-500">{c.wave_start || "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign / freeze cohorts */}
      <details className="rounded-lg border border-line bg-slate-50/60 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink">{cohorts.length ? "Re-freeze / add cohorts" : "Assign cohorts (freezes randomization)"}</summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className="lbl">Cohort codes <span className="font-normal text-slate-400">(class codes, space/comma separated)</span></label>
            <textarea className="field min-h-[54px] font-mono text-xs" value={codes} onChange={(e) => setCodes(e.target.value)} placeholder="NEG-A NEG-B NEG-C NEG-D" />
          </div>
          {cluster ? (
            <div>
              <label className="lbl">Arms <span className="font-normal text-slate-400">(comma separated; control last)</span></label>
              <input className="field" value={arms} onChange={(e) => setArms(e.target.value)} />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="lbl">Waves</label><input className="field" value={waves} onChange={(e) => setWaves(e.target.value)} /></div>
              <div><label className="lbl">Wave 0 start</label><input className="field" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div><label className="lbl">Days between waves</label><input className="field" value={interval} onChange={(e) => setInterval(e.target.value)} /></div>
            </div>
          )}
          <button
            onClick={() => run("assign", cluster
              ? { cohortCodes: codes, arms: arms.split(",").map((s) => s.trim()).filter(Boolean) }
              : { cohortCodes: codes, waves: Number(waves), start: start || undefined, intervalDays: Number(interval) })}
            disabled={busy === "assign" || !codes.trim()}
            className="btn-primary text-sm"
          >{busy === "assign" ? "Freezing…" : "Freeze assignment"}</button>
        </div>
      </details>

      {/* Pre-registration plan */}
      <details className="rounded-lg border border-line bg-slate-50/60 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Pre-registration (estimand & analysis plan)</summary>
        <div className="mt-3 space-y-2">
          <textarea className="field min-h-[90px] text-xs" value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Estimand: ITT effect of the treatment module on L2 competence, cluster-randomized at the cohort. Primary outcome: conversations.outcome (0-100). Analysis: cohort-level means contrasted by condition; 95% CI from between-cohort variance. Attrition: report per arm; ITT keeps all randomized. Pre-registered before any outcome is examined." />
          <button onClick={() => run("prereg", { plan })} disabled={busy === "prereg"} className="btn-ghost text-sm">{busy === "prereg" ? "Saving…" : "Freeze plan"}</button>
        </div>
      </details>

      {/* Live result */}
      {result && result.nLearners > 0 && (
        <div className="rounded-lg border border-line bg-white p-3 text-sm">
          <div className="mb-1 font-semibold text-ink">Cohort-level result</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate2">
            {result.arms.map((a) => (
              <span key={a.label}>{a.label}: <b className="text-ink">{a.mean ?? "—"}</b> <span className="text-slate-400">({a.nCohorts} cohorts, {a.nLearners} learners)</span></span>
            ))}
          </div>
          {result.delta != null && (
            <div className="mt-2 text-sm">
              Effect: <b className="text-ink">{result.delta > 0 ? "+" : ""}{result.delta}</b> competence points
              {result.lo != null && <span className="text-slate-500"> · 95% CI [{result.lo}, {result.hi}]</span>}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-400">{result.note}</p>
        </div>
      )}

      {err && <p className="text-sm text-clay">{err}</p>}
    </div>
  );
}
