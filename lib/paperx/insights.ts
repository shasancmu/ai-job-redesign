import { createAdminClient } from "@/lib/supabase/admin";
import { PAPER_EXPLAINER_TYPE } from "./store";

// Instructor completion analytics for a Paper Explainer, derived from the
// `sessions` completion rows (exercise custom:<slug>) + the teach-back scores
// stored alongside them in `workspaces`. No extra tables required.

export type PxCohortRow = { cohort: string; name: string; enrolled: number; completed: number; completionRate: number; avgScore: number | null };
export type PxInsights = {
  isAuthor: boolean;
  name: string;
  completed: number; // distinct learners who finished
  avgScore: number | null;
  scoreBuckets: { label: string; n: number }[]; // 0-49, 50-74, 75-100
  cohorts: string[]; // cohort tags seen (for the filter)
  perCohort: PxCohortRow[]; // assigned classes, side by side
  recent: { score: number | null; verdict: string; when: string }[];
};

const empty = (name: string, isAuthor: boolean): PxInsights => ({ isAuthor, name, completed: 0, avgScore: null, scoreBuckets: [], cohorts: [], perCohort: [], recent: [] });

export async function paperxInsights(slug: string, authorId: string, cohortFilter?: string | null): Promise<PxInsights> {
  let admin;
  try { admin = createAdminClient(); } catch { return empty(slug, false); }

  const { data: mod } = await admin.from("custom_modules").select("author_id, name").eq("slug", slug).eq("super_type", PAPER_EXPLAINER_TYPE).maybeSingle();
  if (!mod) return empty(slug, false);
  const isAuthor = (mod as any).author_id === authorId;
  const name = (mod as any).name || slug;
  if (!isAuthor) return empty(name, false);

  const exercise = `custom:${slug}`;

  // Completions (optionally scoped to one cohort tag).
  let sq = admin.from("sessions").select("id, host_id, cohort, created_at").eq("exercise", exercise).eq("status", "done").order("created_at", { ascending: false }).limit(5000);
  if (cohortFilter) sq = sq.eq("cohort", cohortFilter);
  const { data: sessRows } = await sq;
  const sessions = (sessRows || []) as { id: string; host_id: string; cohort: string | null; created_at: string }[];

  // Teach-back scores from the linked workspaces.
  const ids = sessions.map((s) => s.id);
  const scoreBySession = new Map<string, number | null>();
  const verdictBySession = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data: ws } = await admin.from("workspaces").select("session_id, canvas").in("session_id", chunk);
    for (const w of ((ws || []) as any[])) {
      const sc = Number(w?.canvas?.score);
      scoreBySession.set(w.session_id, Number.isFinite(sc) ? sc : null);
      verdictBySession.set(w.session_id, String(w?.canvas?.verdict || ""));
    }
  }

  // Distinct learners + score aggregates.
  const byLearner = new Map<string, number | null>(); // best score per learner
  const cohortSet = new Set<string>();
  for (const s of sessions) {
    if (s.cohort) cohortSet.add(s.cohort);
    const sc = scoreBySession.get(s.id) ?? null;
    const prev = byLearner.get(s.host_id);
    if (prev === undefined || (sc !== null && (prev === null || sc > prev))) byLearner.set(s.host_id, sc);
  }
  const scores = [...byLearner.values()].filter((v): v is number => v !== null);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const scoreBuckets = scores.length ? [
    { label: "0–49", n: scores.filter((s) => s < 50).length },
    { label: "50–74", n: scores.filter((s) => s >= 50 && s < 75).length },
    { label: "75–100", n: scores.filter((s) => s >= 75).length },
  ] : [];

  // Assigned classes (author-owned, whose module list includes this slug), with
  // enrollment, so completion is measured against who was actually assigned.
  const perCohort: PxCohortRow[] = [];
  const { data: owned } = await admin.from("classes").select("id, code, name, modules").eq("owner_id", authorId);
  const assigned = ((owned || []) as any[]).filter((c) => Array.isArray(c.modules) && c.modules.map(String).includes(slug));
  if (assigned.length) {
    const enrollCount = new Map<string, number>();
    const { data: mem } = await admin.from("class_members").select("class_id").in("class_id", assigned.map((c) => c.id));
    for (const m of ((mem || []) as any[])) enrollCount.set(m.class_id, (enrollCount.get(m.class_id) || 0) + 1);
    for (const c of assigned) {
      const rows = sessions.filter((s) => s.cohort === c.code);
      const learners = new Set(rows.map((r) => r.host_id));
      const cScores = rows.map((r) => scoreBySession.get(r.id)).filter((v): v is number => typeof v === "number");
      const enrolled = enrollCount.get(c.id) || 0;
      perCohort.push({
        cohort: c.code, name: c.name || c.code, enrolled, completed: learners.size,
        completionRate: enrolled ? learners.size / enrolled : 0,
        avgScore: cScores.length ? Math.round(cScores.reduce((a, b) => a + b, 0) / cScores.length) : null,
      });
    }
  }

  const recent = sessions.slice(0, 12).map((s) => ({ score: scoreBySession.get(s.id) ?? null, verdict: verdictBySession.get(s.id) || "", when: s.created_at }));

  return { isAuthor, name, completed: byLearner.size, avgScore, scoreBuckets, cohorts: [...cohortSet].sort(), perCohort, recent };
}
