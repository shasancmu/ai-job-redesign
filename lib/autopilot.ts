// The autonomous experiment loop. One pass:
//   1. Read every running human experiment's analysis (outcome + the conversation
//      -dynamics signal from the spine).
//   2. Conclusive winner  -> adopt it, RATCHET the winning nudge into the flow's
//      baseline (now live for everyone), and open the next increment on top.
//   3. Enough data, no difference -> retire it and explore a different direction.
//   4. Still collecting -> leave it.
//   5. Capable flows with enough baseline conversations but no live test -> open one.
// Every proposal is informed by the flow's dynamics (is depth/movement improving?),
// so the loop optimizes the conversation, not just the final metric. Deterministic
// stats decide winners; the LLM only drafts the subtle next change. Server-only.

import { createAdminClient } from "@/lib/supabase/admin";
import { computeAnalysis, armDynamics } from "@/lib/experimentStats";
import { experimentProposeAI } from "@/lib/ai";
import { flowLabel, getBaseline, setBaseline, type Experiment, type Variant } from "@/lib/experiments";
import { listExperimentModules } from "@/lib/experimentModules";

export type AutopilotAction = { flow: string; action: string; detail: string };

const MAX_RUNNING = 10;   // never keep more than this many live human experiments
const NEW_PER_RUN = 3;    // open at most this many brand-new flows per pass
const MIN_BASELINE = 20;  // conversations a flow needs before we open a test there

// A flow measures decision quality (score) unless it's a plain interview/canvas
// module (completion). Registry-driven: the kind comes from listExperimentModules.
function scoredKind(kind: string): boolean {
  return kind !== "Interview";
}

export async function runAutopilot(admin: any, opts: { launch?: boolean } = {}): Promise<AutopilotAction[]> {
  const a = admin || createAdminClient();
  const launch = opts.launch !== false;
  const log: AutopilotAction[] = [];

  let exps: Experiment[] = [];
  try {
    const { data } = await a.from("experiments").select("*").eq("mode", "human");
    exps = (data || []) as Experiment[];
  } catch { return log; }

  const running = exps.filter((e) => e.status === "running");
  const flowsWithLive = new Set(exps.filter((e) => e.status === "running" || e.status === "proposed").map((e) => e.flow));
  let runningCount = running.length;

  // --- 1-4: evaluate each running experiment --------------------------------
  for (const exp of running) {
    let analysis: any;
    try { analysis = await computeAnalysis(a, exp); } catch { continue; }

    if (analysis.conclusive) {
      const treatmentWon = (analysis.liftAbs ?? 0) > 0;
      await conclude(a, exp.id, treatmentWon ? "adopted" : "concluded", analysis);
      runningCount--;

      if (treatmentWon) {
        const winNudge = (exp.variants || []).find((v: Variant) => v.key === "treatment")?.nudge || "";
        const base = await getBaseline(a, exp.flow, exp.target);
        const newBase = [base, winNudge].filter(Boolean).join(" ").slice(0, 800);
        await setBaseline(a, exp.flow, exp.target, newBase, winNudge);
        const pts = analysis.liftAbs != null ? `+${(analysis.liftAbs * 100).toFixed(1)}pts` : "";
        log.push({ flow: exp.flow, action: "adopted + ratcheted", detail: `treatment won (${pts}) — now the baseline for ${flowLabel(exp.flow)}` });
        // Open the next increment on top of the new baseline.
        if (runningCount < MAX_RUNNING) {
          const opened = await openNext(a, exp, newBase, launch, `The current baseline already includes: "${newBase}". Propose the NEXT subtle increment on top of it.`);
          if (opened) { runningCount++; flowsWithLive.add(exp.flow); log.push({ flow: exp.flow, action: "opened next increment", detail: opened }); }
        }
      } else {
        log.push({ flow: exp.flow, action: "concluded", detail: `control held; treatment not adopted for ${flowLabel(exp.flow)}` });
        if (runningCount < MAX_RUNNING) {
          const opened = await openNext(a, exp, await getBaseline(a, exp.flow, exp.target), launch, "The last treatment did not beat control. Try a DIFFERENT direction.");
          if (opened) { runningCount++; flowsWithLive.add(exp.flow); log.push({ flow: exp.flow, action: "exploring new direction", detail: opened }); }
        }
      }
    } else if (analysis.reachedSample) {
      await conclude(a, exp.id, "rejected", analysis);
      runningCount--;
      log.push({ flow: exp.flow, action: "retired", detail: `no significant difference on ${flowLabel(exp.flow)}` });
      if (runningCount < MAX_RUNNING) {
        const opened = await openNext(a, exp, await getBaseline(a, exp.flow, exp.target), launch, "The last test was flat (no significant difference). Try a DIFFERENT, bolder-but-still-safe direction.");
        if (opened) { runningCount++; flowsWithLive.add(exp.flow); log.push({ flow: exp.flow, action: "exploring new direction", detail: opened }); }
      }
    }
    // else: still collecting — leave it running.
  }

  // --- 5: open coverage on untested flows that have enough baseline data -----
  // Registry-driven: every experimentable module — built-in AND authored/custom —
  // is a candidate, so a new module auto-enrolls once it has baseline traffic.
  let flows: { key: string; label: string; kind: string }[] = [];
  try { flows = await listExperimentModules(a); } catch { flows = []; }
  let opened = 0;
  for (const f of flows) {
    if (runningCount >= MAX_RUNNING || opened >= NEW_PER_RUN) break;
    if (flowsWithLive.has(f.key)) continue;
    let n = 0;
    try {
      const { count } = await a.from("conversations").select("conversation_id", { count: "exact", head: true }).eq("module", f.key);
      n = count || 0;
    } catch { n = 0; }
    if (n < MIN_BASELINE) continue;
    const draftMsg = await openFresh(a, f.key, "interview", launch, n, scoredKind(f.kind));
    if (draftMsg) { runningCount++; opened++; flowsWithLive.add(f.key); log.push({ flow: f.key, action: "opened", detail: draftMsg }); }
  }

  if (!log.length) log.push({ flow: "-", action: "no-op", detail: "nothing to do this pass (all live tests still collecting, nothing conclusive)" });
  return log;
}

async function conclude(admin: any, id: string, status: string, analysis: any): Promise<void> {
  try {
    await admin.from("experiments").update({
      status,
      concluded_at: new Date().toISOString(),
      result: { analysis, autopilot: true, at: new Date().toISOString() },
    }).eq("id", id);
  } catch { /* ignore */ }
}

// Draft (via the LLM, dynamics-informed) and create the next experiment for a
// flow, with control = the current baseline and treatment = baseline + increment.
async function openNext(admin: any, prev: Experiment, controlNudge: string, launch: boolean, extraGoal: string): Promise<string | null> {
  const draft = await draftFor(admin, prev.flow, prev.target, extraGoal);
  if (!draft?.treatmentNudge) return null;
  const treatmentNudge = [controlNudge, draft.treatmentNudge].filter(Boolean).join(" ").slice(0, 800);
  // A follow-on keeps the same metric as the experiment it builds on.
  const metric = prev.metric;
  const ok = await create(admin, {
    flow: prev.flow, target: prev.target, metric,
    name: String(draft.name || `${flowLabel(prev.flow)} refinement`).slice(0, 120),
    hypothesis: String(draft.hypothesis || "").slice(0, 600),
    min_per_arm: clampN(draft.min_per_arm),
    controlNudge, treatmentLabel: String(draft.treatmentLabel || "Treatment").slice(0, 60), treatmentNudge,
  }, launch);
  return ok ? `${draft.name || "next increment"} (${metric}${launch ? ", launched" : ", proposed"})` : null;
}

async function openFresh(admin: any, flow: string, target: "interview" | "report", launch: boolean, baselineN: number, scored: boolean): Promise<string | null> {
  const controlNudge = await getBaseline(admin, flow, target);
  const draft = await draftFor(admin, flow, target, controlNudge ? `The current baseline already includes: "${controlNudge}".` : "");
  if (!draft?.treatmentNudge) return null;
  const treatmentNudge = [controlNudge, draft.treatmentNudge].filter(Boolean).join(" ").slice(0, 800);
  const metric = scored ? "score" : normMetric(draft.metric);
  const ok = await create(admin, {
    flow, target, metric,
    name: String(draft.name || `${flowLabel(flow)} experiment`).slice(0, 120),
    hypothesis: String(draft.hypothesis || "").slice(0, 600),
    min_per_arm: clampN(draft.min_per_arm),
    controlNudge, treatmentLabel: String(draft.treatmentLabel || "Treatment").slice(0, 60), treatmentNudge,
  }, launch);
  return ok ? `${draft.name || "new experiment"} — ${baselineN} baseline convos (${metric}${launch ? ", launched" : ", proposed"})` : null;
}

// Ask the model for a subtle change, handing it the flow's live dynamics so the
// next move optimizes the conversation (depth/movement), not just the metric.
async function draftFor(admin: any, flow: string, target: "interview" | "report", extraGoal: string): Promise<any | null> {
  try {
    const dyn = await armDynamics(admin, flow);
    const dynLine = dyn.length
      ? "Conversation dynamics so far by arm — " + dyn.map((d) => `${d.variant_key}: depth ${d.avgDepth ?? "?"}, movement ${d.avgMovement ?? "?"}, n=${d.n}`).join("; ") + "."
      : "";
    const { data: past } = await admin.from("experiments").select("hypothesis, status").eq("flow", flow).in("status", ["concluded", "adopted", "rejected"]).limit(6);
    const goal = ["Increase engagement and decision quality without degrading integrity.", dynLine, extraGoal].filter(Boolean).join(" ");
    return await experimentProposeAI({
      flow, flowLabel: flowLabel(flow), target, goal,
      past: (past || []).map((p: any) => ({ hypothesis: p.hypothesis, outcome: p.status })),
    });
  } catch { return null; }
}

async function create(admin: any, e: {
  flow: string; target: "interview" | "report"; metric: string; name: string; hypothesis: string;
  min_per_arm: number; controlNudge: string; treatmentLabel: string; treatmentNudge: string;
}, launch: boolean): Promise<boolean> {
  const variants: Variant[] = [
    { key: "control", label: "Control", nudge: e.controlNudge || "" },
    { key: "treatment", label: e.treatmentLabel, nudge: e.treatmentNudge },
  ];
  try {
    const { error } = await admin.from("experiments").insert({
      flow: e.flow, name: e.name, hypothesis: e.hypothesis, metric: e.metric,
      depth_threshold: 4, variants, min_per_arm: e.min_per_arm,
      status: launch ? "running" : "proposed", target: e.target, mode: "human",
      created_by: "agent", launched_at: launch ? new Date().toISOString() : null,
    });
    return !error;
  } catch { return false; }
}

function normMetric(m: any): "completion" | "depth" | "shared" {
  return ["completion", "depth", "shared"].includes(m) ? m : "completion";
}
function clampN(n: any): number {
  return Math.max(20, Math.min(2000, Number(n) || 100));
}
