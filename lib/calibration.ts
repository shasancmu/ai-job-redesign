// L2 calibration: draw runs for a human to score (blind), store the ratings, and
// report how well the AI grader agrees with the humans. Server-only.
import { agreement, humanCeiling, type Reliability } from "@/lib/reliability";
import { moduleByExercise } from "@/lib/modules";

export type RateItem = { conversationId: string; module: string | null; turns: { speaker: string; text: string }[] };

// One finished run this rater hasn't scored yet, blind: transcript only — no arm,
// no AI score, so the human judgment is independent. Random among a recent batch.
export async function sampleNextForRating(admin: any, raterId: string, module?: string): Promise<RateItem | null> {
  try {
    let q = admin.from("conversations")
      .select("conversation_id, module")
      .not("outcome", "is", null).not("ended_at", "is", null)
      .order("ended_at", { ascending: false }).limit(400);
    if (module) q = q.eq("module", module);
    const { data } = await q;
    const runs = (data || []) as { conversation_id: string; module: string | null }[];
    if (!runs.length) return null;

    const { data: mine } = await admin.from("rater_scores").select("conversation_id").eq("rater_id", raterId);
    const rated = new Set(((mine || []) as any[]).map((r) => r.conversation_id));
    const open = runs.filter((r) => !rated.has(r.conversation_id));
    if (!open.length) return null;

    const pick = open[Math.floor(Math.random() * open.length)];
    const { data: turns } = await admin.from("conversation_turns")
      .select("speaker, text, turn_index").eq("conversation_id", pick.conversation_id).order("turn_index", { ascending: true });
    return {
      conversationId: pick.conversation_id,
      module: pick.module,
      turns: ((turns || []) as any[]).map((t) => ({ speaker: t.speaker, text: t.text || "" })),
    };
  } catch { return null; }
}

export async function saveRating(admin: any, r: { conversationId: string; module?: string | null; raterId: string; raterEmail?: string | null; score: number; rubricVersion?: string; notes?: string }): Promise<void> {
  await admin.from("rater_scores").upsert({
    conversation_id: r.conversationId, module: r.module || null, rater_id: r.raterId, rater_email: r.raterEmail || null,
    score: Math.max(0, Math.min(100, Math.round(r.score))), rubric_version: r.rubricVersion || null, notes: (r.notes || "").slice(0, 1000) || null,
  }, { onConflict: "conversation_id,rater_id" });
}

export type ModuleCalibration = {
  module: string; label: string;
  aiVsHuman: Reliability;
  ceiling: { n: number; icc: number | null; verdict: string };
  raters: number;
};

// The report: for each module (and overall), pair the AI's competence score with
// the mean human score per run, then compute agreement. Runs rated by ≥2 humans
// also give the human-among-human ceiling.
export async function calibrationReport(admin: any): Promise<{ modules: ModuleCalibration[]; overall: ModuleCalibration | null; totalRatings: number }> {
  try {
    const { data: rs } = await admin.from("rater_scores").select("conversation_id, module, rater_id, score").limit(50000);
    const ratings = (rs || []) as { conversation_id: string; module: string | null; rater_id: string; score: number }[];
    if (!ratings.length) return { modules: [], overall: null, totalRatings: 0 };

    const ids = [...new Set(ratings.map((r) => r.conversation_id))];
    // AI scores for the same runs, in id-keyed chunks (avoid an over-long IN list).
    const aiById = new Map<string, number>();
    for (let i = 0; i < ids.length; i += 500) {
      const { data } = await admin.from("conversations").select("conversation_id, outcome, module").in("conversation_id", ids.slice(i, i + 500));
      for (const c of ((data || []) as any[])) if (typeof c.outcome === "number") aiById.set(c.conversation_id, c.outcome);
    }

    // Group human ratings per run.
    const perRun = new Map<string, { module: string | null; humans: number[]; raters: Set<string> }>();
    for (const r of ratings) {
      if (!perRun.has(r.conversation_id)) perRun.set(r.conversation_id, { module: r.module, humans: [], raters: new Set() });
      const p = perRun.get(r.conversation_id)!; p.humans.push(r.score); p.raters.add(r.rater_id);
    }

    const build = (runIds: string[], moduleKey: string): ModuleCalibration => {
      const ai: number[] = [], human: number[] = [], humanPairs: number[][] = [];
      const raterSet = new Set<string>();
      for (const id of runIds) {
        const p = perRun.get(id)!;
        p.raters.forEach((x) => raterSet.add(x));
        if (p.humans.length >= 2) humanPairs.push(p.humans);
        const a = aiById.get(id);
        if (typeof a === "number") { ai.push(a); human.push(p.humans.reduce((x, y) => x + y, 0) / p.humans.length); }
      }
      return {
        module: moduleKey,
        label: moduleByExercise(moduleKey)?.name || moduleKey || "All modules",
        aiVsHuman: agreement(ai, human),
        ceiling: humanCeiling(humanPairs),
        raters: raterSet.size,
      };
    };

    const byModule = new Map<string, string[]>();
    for (const [id, p] of perRun) { const m = p.module || "unknown"; (byModule.get(m) || byModule.set(m, []).get(m)!).push(id); }
    const modules = [...byModule.entries()].map(([m, runIds]) => build(runIds, m)).filter((c) => c.aiVsHuman.n > 0).sort((a, b) => b.aiVsHuman.n - a.aiVsHuman.n);
    const overall = build([...perRun.keys()], "");

    return { modules, overall: overall.aiVsHuman.n > 0 ? overall : null, totalRatings: ratings.length };
  } catch { return { modules: [], overall: null, totalRatings: 0 }; }
}
