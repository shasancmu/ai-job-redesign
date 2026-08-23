import { moduleByExercise } from "@/lib/modules";

// Spaced retrieval follow-ups. When a learner commits an if-then after a report
// (lib -> workspaces.canvas.reflection), it becomes a check-in that surfaces
// once its date arrives (or a few days after, if no date). The check-in asks
// them to RECALL the takeaway before reporting the outcome — spacing + retrieval.

export type FollowUp = { code: string; slug: string; moduleName: string; commitment: any; when: string };

type SB = { from: (t: string) => any };

const DUE_MS = 4 * 24 * 3600 * 1000; // fall back to ~4 days if no explicit date

export async function dueFollowUps(supabase: SB, userId: string): Promise<FollowUp[]> {
  const { data: wss } = await supabase
    .from("workspaces")
    .select("session_id, canvas")
    .eq("author_id", userId)
    .limit(400);

  const pending = ((wss as any[]) || []).filter((w) => {
    const r = w.canvas?.reflection;
    return r && r.commitment && !r.followedUpAt;
  });
  if (!pending.length) return [];

  const now = Date.now();
  const sessionIds = pending.map((w) => w.session_id).filter(Boolean);
  const { data: sess } = await supabase.from("sessions").select("id, code, exercise").in("id", sessionIds);
  const byId = new Map(((sess as any[]) || []).map((s) => [s.id, s]));

  const out: FollowUp[] = [];
  for (const w of pending) {
    const r = w.canvas.reflection;
    const dateDue = r.commitment.date ? new Date(r.commitment.date).getTime() <= now : false;
    const ageDue = r.at ? now - new Date(r.at).getTime() >= DUE_MS : false;
    if (!dateDue && !ageDue) continue;
    const s = byId.get(w.session_id);
    if (!s) continue;
    const m = moduleByExercise(s.exercise);
    if (!m) continue;
    out.push({ code: s.code, slug: m.slug, moduleName: m.name, commitment: r.commitment, when: r.at || r.commitment.date });
  }
  // Soonest first.
  out.sort((a, b) => (a.when < b.when ? -1 : 1));
  return out.slice(0, 4);
}

// ---- Calibration (metacognition) --------------------------------------------
// How close the learner's predictions have been across modules. Surfaces on
// /achievements so the gap between guess and reality becomes visible over time.

export type CalibrationSummary = {
  count: number;
  avg: number; // 1 (way off) .. 5 (spot on)
  recent: { moduleName: string; slug: string; code: string; calibration: number }[];
};

export async function calibrationSummary(supabase: SB, userId: string): Promise<CalibrationSummary> {
  const { data: wss } = await supabase
    .from("workspaces")
    .select("session_id, canvas")
    .eq("author_id", userId)
    .limit(400);

  const rows = ((wss as any[]) || [])
    .map((w) => ({ sid: w.session_id, cal: w.canvas?.reflection?.calibration }))
    .filter((x) => Number.isFinite(x.cal));
  if (!rows.length) return { count: 0, avg: 0, recent: [] };

  const { data: sess } = await supabase
    .from("sessions")
    .select("id, code, exercise, created_at")
    .in("id", rows.map((r) => r.sid).filter(Boolean));
  const byId = new Map(((sess as any[]) || []).map((s) => [s.id, s]));

  const recent = rows
    .map((r) => {
      const s = byId.get(r.sid);
      const m = s && moduleByExercise(s.exercise);
      return s && m ? { moduleName: m.name, slug: m.slug, code: s.code, calibration: r.cal, at: s.created_at } : null;
    })
    .filter(Boolean) as any[];
  recent.sort((a, b) => (a.at < b.at ? 1 : -1));

  const avg = rows.reduce((s, r) => s + r.cal, 0) / rows.length;
  return { count: rows.length, avg, recent: recent.slice(0, 5) };
}

// ---- Learning journal --------------------------------------------------------
// The learner's own recalled takeaways from the spaced check-ins, in their
// words. Makes learning visible and durable (a lightweight learner model,
// surfaced to the person rather than injected into prompts).

export type JournalEntry = { moduleName: string; slug: string; code: string; recall: string; outcome?: string; commitment?: string; at: string };

export async function learningJournal(supabase: SB, userId: string): Promise<JournalEntry[]> {
  const { data: wss } = await supabase
    .from("workspaces")
    .select("session_id, canvas")
    .eq("author_id", userId)
    .limit(400);

  const withRecall = ((wss as any[]) || [])
    .map((w) => ({ sid: w.session_id, r: w.canvas?.reflection }))
    .filter((x) => x.r && typeof x.r.recall === "string" && x.r.recall.trim());
  if (!withRecall.length) return [];

  const { data: sess } = await supabase
    .from("sessions")
    .select("id, code, exercise")
    .in("id", withRecall.map((x) => x.sid).filter(Boolean));
  const byId = new Map(((sess as any[]) || []).map((s) => [s.id, s]));

  const out = withRecall
    .map((x) => {
      const s = byId.get(x.sid);
      const m = s && moduleByExercise(s.exercise);
      if (!s || !m) return null;
      return {
        moduleName: m.name,
        slug: m.slug,
        code: s.code,
        recall: x.r.recall.trim(),
        outcome: x.r.outcome,
        commitment: x.r.commitment?.text,
        at: x.r.followedUpAt || x.r.at || "",
      };
    })
    .filter(Boolean) as JournalEntry[];

  out.sort((a, b) => (a.at < b.at ? 1 : -1));
  return out.slice(0, 20);
}
