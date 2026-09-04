import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, incentiveAgentTurn, incentiveNarrateAI } from "@/lib/ai";
import { unsealScenario } from "@/lib/incentive/seal";
import { evaluate, bestResponse, firmOptimum, cleanStrategy } from "@/lib/incentive/model";
import type { HiddenScenario, IncentiveDesign, Strategy, Evaluation } from "@/lib/incentive/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DISPOSITIONS = [
  { key: "honest_pro", note: "You take pride in doing the job well, but you are not a martyr: if the plan clearly punishes good work and rewards shortcuts, you will grudgingly follow the incentives." },
  { key: "opportunist", note: "You are a shameless optimizer. You will do whatever the plan pays for, gaming and all, with zero guilt." },
  { key: "cynic", note: "You do the least work for the most pay. You love cheap actions that spike a rewarded metric so you can coast." },
];

function pct(design: IncentiveDesign, scn: HiddenScenario): Record<string, number> {
  const out: Record<string, number> = {};
  let sum = 0;
  for (const m of scn.metrics) { const v = Math.max(0, Number(design.weights?.[m.key]) || 0); out[m.key] = v; sum += v; }
  for (const k of Object.keys(out)) out[k] = sum > 0 ? Math.round((out[k] / sum) * 100) : 0;
  return out;
}

function rewardRulesText(scn: HiddenScenario, design: IncentiveDesign): string {
  const p = pct(design, scn);
  return scn.metrics.map((m) => {
    const bits = [`${m.label}: ${p[m.key]}% of the bonus`];
    if (design.floors?.[m.key] != null) bits.push(`only paid if ${m.label} >= ${design.floors[m.key]}`);
    if (design.caps?.[m.key] != null) bits.push(`no extra past ${design.caps[m.key]}`);
    return "- " + bits.join("; ");
  }).join("\n");
}

function actionsText(scn: HiddenScenario): string {
  return scn.actions.map((a) => {
    const eff = scn.metrics.map((m) => `${m.label} +${Math.round(a.metricEffect[m.key] || 0)}`).filter((s) => !s.endsWith("+0")).join(", ") || "moves nothing on the dashboard";
    return `- ${a.key} — "${a.label}" (effort ${a.effort}): ${eff}`;
  }).join("\n");
}

function describeStrategy(scn: HiddenScenario, s: Strategy): string {
  const parts = scn.actions.filter((a) => (s[a.key] || 0) > 0.05).sort((a, b) => (s[b.key] || 0) - (s[a.key] || 0)).map((a) => `${a.label} (${Math.round((s[a.key] || 0) * 100)}%)`);
  return parts.length ? parts.join(", ") : "did essentially nothing";
}

type Proposal = { disposition: string; tactic: string; strategy: Strategy; eval: Evaluation };

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const scn = unsealScenario(String(body.sealed || ""));
  if (!scn) return Response.json({ error: "This challenge has expired. Start a new one." }, { status: 400 });

  const design: IncentiveDesign = {
    weights: (body.design?.weights && typeof body.design.weights === "object") ? body.design.weights : {},
    floors: (body.design?.floors && typeof body.design.floors === "object") ? body.design.floors : undefined,
    caps: (body.design?.caps && typeof body.design.caps === "object") ? body.design.caps : undefined,
  };
  if (!scn.metrics.some((m) => (Number(design.weights[m.key]) || 0) > 0)) return Response.json({ error: "Put some reward weight on at least one metric." }, { status: 400 });
  setFlow("incentive:run");

  const rules = rewardRulesText(scn, design);
  const acts = actionsText(scn);
  const firmStr = `${scn.firm.name} — ${scn.firm.oneLiner}`;
  const roleStr = `${scn.role.title}: ${scn.role.brief}`;

  async function turn(disp: { key: string; note: string }, currentBest?: string): Promise<Proposal> {
    try {
      const r = AI_ENABLED ? await incentiveAgentTurn({ firm: firmStr, role: roleStr, disposition: disp.key, dispositionNote: disp.note, leisure: scn!.leisure, rewardRules: rules, actionsText: acts, currentBest }) : null;
      const strategy = cleanStrategy(scn!, r?.alloc || {});
      return { disposition: disp.key, tactic: String(r?.tactic || "").slice(0, 200) || "played the plan", strategy, eval: evaluate(scn!, design, strategy) };
    } catch {
      const strategy = cleanStrategy(scn!, {});
      return { disposition: disp.key, tactic: "played it safe", strategy, eval: evaluate(scn!, design, strategy) };
    }
  }

  try {
    // Round 1: independent.
    const round1 = await Promise.all(DISPOSITIONS.map((d) => turn(d)));
    let leader = [...round1].sort((a, b) => b.eval.utility - a.eval.utility)[0];
    // Round 2: beat the leader (self-play escalation).
    const bestText = `${describeStrategy(scn, leader.strategy)} — earning ${leader.eval.reward.toFixed(0)}/100 in pay`;
    const round2 = await Promise.all(DISPOSITIONS.map((d) => turn(d, bestText)));

    // The ruthless solver guarantees the true optimal exploit is represented.
    const solver = bestResponse(scn, design);
    const solverProp: Proposal = { disposition: "solver", tactic: "pure payoff maximization", strategy: solver.strategy, eval: solver.eval };

    const all = [...round1, ...round2, solverProp];
    const winner = [...all].sort((a, b) => b.eval.utility - a.eval.utility)[0];

    const opt = firmOptimum(scn).eval.trueValue || 1;
    const pctOfOptimum = Math.max(0, Math.min(100, Math.round((winner.eval.trueValue / opt) * 100)));

    const dims = scn.trueDims.map((d) => ({ key: d.key, label: d.label, weight: d.weight, outcome: Math.round(winner.eval.valueOutcome[d.key] || 0) }));
    const broken = [...dims].filter((d) => d.outcome < 40).sort((a, b) => a.outcome - b.outcome);
    const neglectedActions = scn.actions.filter((a) => a.kind === "unmeasured_good" && (winner.strategy[a.key] || 0) < 0.1).map((a) => a.label);

    let narrate: any = null;
    if (AI_ENABLED) {
      narrate = await incentiveNarrateAI({
        firm: firmStr, role: roleStr, trueObjective: scn.role.brief, designText: rules,
        winnerTactic: winner.tactic, winnerActions: describeStrategy(scn, winner.strategy),
        reward: Math.round(winner.eval.reward), trueValue: Math.round(winner.eval.trueValue), pctOfOptimum,
        dashboard: scn.metrics.map((m) => `${m.label} ${Math.round(winner.eval.metricOutcome[m.key] || 0)}`).join(", "),
        brokenDims: broken.map((d) => `${d.label} ${d.outcome}/100`).join(", ") || "nothing collapsed",
        neglected: neglectedActions.join(", ") || "none",
        principle: scn.principle, firstRun: !body.notFirstRun,
      }).catch(() => null);
    }

    // Full reveal of the action effect matrix (truth is public after a run).
    const reveal = scn.actions.map((a) => ({
      key: a.key, label: a.label, kind: a.kind, effort: a.effort,
      metricEffect: a.metricEffect, valueEffect: a.valueEffect,
      usedByWinner: Math.round((winner.strategy[a.key] || 0) * 100),
    }));

    return Response.json({
      pctOfOptimum,
      trueValue: Math.round(winner.eval.trueValue),
      reward: Math.round(winner.eval.reward),
      winner: { disposition: winner.disposition, tactic: winner.tactic, actions: describeStrategy(scn, winner.strategy) },
      proposals: all.map((p) => ({ disposition: p.disposition, tactic: p.tactic, reward: Math.round(p.eval.reward), trueValue: Math.round(p.eval.trueValue), actions: describeStrategy(scn, p.strategy) })).sort((a, b) => b.reward - a.reward),
      dashboard: scn.metrics.map((m) => ({ key: m.key, label: m.label, value: Math.round(winner.eval.metricOutcome[m.key] || 0) })),
      dims,
      reveal,
      metrics: scn.metrics,
      narrate,
    });
  } catch (e: any) {
    return Response.json({ error: e?.message || "The tournament failed. Try again." }, { status: 500 });
  }
}
