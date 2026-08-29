import { moduleByExercise } from "@/lib/modules";

// A director-facing, org-scoped outcomes summary — the "proof" surface. Rolls up
// participation, completion, and judgment (calibration) across all of an org's
// cohorts. Read-only aggregation over existing tables; best-effort per source so
// one missing table never blanks the whole report.

export type OrgOutcomes = {
  learners: number;                 // people enrolled in the org's cohorts
  active: number;                   // learners who ran at least one exercise
  runs: number;                     // total exercise runs across the org's cohorts
  completionPct: number | null;     // completes / starts (null if no funnel data yet)
  starts: number;
  completes: number;
  topExercises: { name: string; emoji: string; count: number }[];
  calibration: { answered: number; verdict: string; gap: number } | null;
  cohorts: { name: string; code: string; learners: number; active: number; runs: number }[];
};

const cap = <T,>(a: T[], n = 2000): T[] => (a.length > n ? a.slice(0, n) : a);

export async function gatherOrgOutcomes(admin: any, org: { id: string; name: string }): Promise<OrgOutcomes> {
  // 1) The org's cohorts.
  const { data: classes } = await admin.from("classes").select("id, code, name, is_default").eq("org_id", org.id);
  const cohortRows = ((classes as any[]) || []).filter(Boolean);
  const classIds = cohortRows.map((c) => c.id);
  const codeByClass = new Map<string, string>(cohortRows.map((c) => [c.id, c.code]));

  // 2) Enrolled learners, per cohort and overall.
  const membersByCode = new Map<string, Set<string>>();
  const allMembers = new Set<string>();
  if (classIds.length) {
    const { data: cms } = await admin.from("class_members").select("class_id, user_id").in("class_id", cap(classIds));
    for (const r of (cms as any[]) || []) {
      const code = codeByClass.get(r.class_id);
      if (!code) continue;
      if (!membersByCode.has(code)) membersByCode.set(code, new Set());
      membersByCode.get(code)!.add(r.user_id);
      allMembers.add(r.user_id);
    }
  }
  const memberIds = cap([...allMembers]);
  const cohortCodes = cohortRows.map((c) => c.code);

  // 3) Runs across the org's cohorts (cohort-tagged sessions), with active
  //    learners and the most-run exercises.
  const activeByCode = new Map<string, Set<string>>();
  const runsByCode = new Map<string, number>();
  const active = new Set<string>();
  const exCount = new Map<string, number>();
  let runs = 0;
  if (cohortCodes.length) {
    const { data: sess } = await admin
      .from("sessions")
      .select("exercise, host_id, guest_id, cohort")
      .in("cohort", cap(cohortCodes))
      .limit(50000);
    for (const s of (sess as any[]) || []) {
      runs++;
      runsByCode.set(s.cohort, (runsByCode.get(s.cohort) || 0) + 1);
      if (s.exercise) exCount.set(s.exercise, (exCount.get(s.exercise) || 0) + 1);
      for (const uid of [s.host_id, s.guest_id]) {
        if (!uid) continue;
        active.add(uid);
        if (!activeByCode.has(s.cohort)) activeByCode.set(s.cohort, new Set());
        activeByCode.get(s.cohort)!.add(uid);
      }
    }
  }
  const topExercises = [...exCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([exercise, count]) => {
      const m = moduleByExercise(exercise);
      return { name: m?.name || exercise, emoji: m?.emoji || "•", count };
    });

  // 4) Completion funnel (module_events) for the org's learners.
  let starts = 0, completes = 0;
  if (memberIds.length) {
    try {
      const { data: ev } = await admin.from("module_events").select("stage, user_id").in("user_id", memberIds).limit(100000);
      const startSet = new Set<string>(), doneSet = new Set<string>();
      for (const r of (ev as any[]) || []) {
        if (r.stage === "start") startSet.add(r.user_id);
        else if (r.stage === "complete") { doneSet.add(r.user_id); startSet.add(r.user_id); }
      }
      starts = startSet.size; completes = doneSet.size;
    } catch { /* module_events missing */ }
  }
  const completionPct = starts > 0 ? Math.round((completes / starts) * 100) : null;

  // 5) Judgment: average calibration gap across quiz attempts (positive =
  //    overconfident). A director-legible readout, not the raw Brier score.
  let calibration: OrgOutcomes["calibration"] = null;
  if (memberIds.length) {
    try {
      const { data: qa } = await admin.from("quiz_attempts").select("calibration").in("user_id", memberIds).limit(20000);
      const gaps: number[] = [];
      for (const r of (qa as any[]) || []) {
        const g = (r.calibration as any)?.gap;
        if (typeof g === "number") gaps.push(g);
      }
      if (gaps.length) {
        const gap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
        const verdict = gap > 5 ? "tended to be overconfident" : gap < -5 ? "tended to be underconfident" : "were well-calibrated";
        calibration = { answered: gaps.length, verdict, gap: Math.round(gap) };
      }
    } catch { /* quiz_attempts missing */ }
  }

  const cohorts = cohortRows
    .map((c) => ({
      name: c.is_default ? "All members" : c.name,
      code: c.code,
      learners: membersByCode.get(c.code)?.size || 0,
      active: activeByCode.get(c.code)?.size || 0,
      runs: runsByCode.get(c.code) || 0,
    }))
    .sort((a, b) => b.runs - a.runs);

  return {
    learners: allMembers.size,
    active: active.size,
    runs,
    completionPct,
    starts,
    completes,
    topExercises,
    calibration,
    cohorts,
  };
}
