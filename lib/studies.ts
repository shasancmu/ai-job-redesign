// Cohort-level field experiments (Level 2). A study groups cohorts (classes) into
// a randomized design and FREEZES their assignment, so the causal contrast is by
// design. Two designs, both defensible:
//   cluster       — cohorts randomized to a condition; the contrast is a cluster RCT
//                   at the unit a customer deploys (analyze at the cohort level).
//   stepped_wedge — cohorts assigned to waves; treatment unlocks at wave_start, and
//                   not-yet-treated cohorts are the control. Everyone eventually
//                   treated (ethical, procurement-clean).
//
// Everything here degrades to normal behavior when a cohort is in no study, so the
// machinery is invisible until a study is actually created and started.
import { createAdminClient } from "@/lib/supabase/admin";

// FNV-1a → [0,1), salted per use. Same family as lib/holdout so the whole platform
// randomizes with one well-understood hash.
function hash01(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) / 0xffffffff;
}

export function newSeed(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export type Study = {
  id: string; slug: string; name: string; org_id: string | null;
  design: "cluster" | "stepped_wedge"; metric: string; intake_code: string | null;
  seed: string; status: "draft" | "running" | "concluded"; plan: any;
  preregistered_at: string | null; created_by: string | null; created_at: string;
};
export type StudyCohort = {
  study_id: string; cohort_code: string; condition: string | null;
  wave: number | null; wave_start: string | null; intake_open: boolean; assigned_at: string;
};

export async function getStudy(admin: any, idOrSlug: string): Promise<Study | null> {
  try {
    const col = idOrSlug.includes("-") && idOrSlug.length > 20 ? "id" : "slug";
    const { data } = await admin.from("studies").select("*").eq(col, idOrSlug).maybeSingle();
    return (data as Study) || null;
  } catch { return null; }
}

// Freeze the cohort → condition/wave assignment. Pure function of (seed, code): the
// same inputs always yield the same assignment, which is the pre-registration
// guarantee. Cluster splits by hash; stepped-wedge orders cohorts by hash into
// `waves` groups and dates each wave from `start` + wave*intervalDays.
export async function assignCohorts(
  admin: any,
  study: Study,
  cohortCodes: string[],
  opts: { arms?: string[]; waves?: number; start?: string; intervalDays?: number } = {},
): Promise<StudyCohort[]> {
  const codes = [...new Set(cohortCodes.map((c) => String(c || "").toUpperCase().trim()).filter(Boolean))];
  const rows: StudyCohort[] = [];

  if (study.design === "stepped_wedge") {
    const waves = Math.max(2, opts.waves || Math.min(codes.length, 4));
    const start = opts.start ? new Date(opts.start) : new Date();
    const interval = opts.intervalDays || 14;
    // Order cohorts by their frozen hash, then slice into balanced waves.
    const ordered = codes.map((code) => ({ code, r: hash01(study.seed + ":wedge:" + code) })).sort((a, b) => a.r - b.r);
    ordered.forEach((o, i) => {
      const wave = Math.floor((i * waves) / ordered.length);
      const ws = new Date(start); ws.setDate(ws.getDate() + wave * interval);
      rows.push({ study_id: study.id, cohort_code: o.code, condition: null, wave, wave_start: ws.toISOString().slice(0, 10), intake_open: true, assigned_at: new Date().toISOString() });
    });
  } else {
    const arms = opts.arms && opts.arms.length >= 2 ? opts.arms : ["treatment", "control"];
    for (const code of codes) {
      const idx = Math.floor(hash01(study.seed + ":arm:" + code) * arms.length) % arms.length;
      rows.push({ study_id: study.id, cohort_code: code, condition: arms[idx], wave: null, wave_start: null, intake_open: true, assigned_at: new Date().toISOString() });
    }
  }

  await admin.from("study_cohorts").upsert(rows, { onConflict: "study_id,cohort_code" });
  return rows;
}

// The study (if any) governing a cohort, with that cohort's frozen assignment.
// Prefers a running study; a cohort is expected to be in at most one.
export async function governingStudy(admin: any, cohortCode: string): Promise<{ study: Study; cohort: StudyCohort } | null> {
  if (!cohortCode) return null;
  try {
    const { data } = await admin.from("study_cohorts").select("*, studies(*)").eq("cohort_code", cohortCode.toUpperCase());
    const rows = (data || []) as any[];
    if (!rows.length) return null;
    const running = rows.find((r) => r.studies?.status === "running") || rows[0];
    if (!running?.studies) return null;
    const { studies, ...cohort } = running;
    return { study: studies as Study, cohort: cohort as StudyCohort };
  } catch { return null; }
}

// Is this cohort's treatment live right now? Cluster: any non-control arm. Stepped-
// wedge: on/after its wave_start. Used as a SOFT gate — default open.
export function treatmentUnlocked(study: Study, cohort: StudyCohort, now = new Date()): boolean {
  if (study.design === "stepped_wedge") return !cohort.wave_start || now >= new Date(cohort.wave_start + "T00:00:00Z");
  return (cohort.condition || "treatment") !== "control";
}

// Soft access gate for a cohort in a RUNNING stepped-wedge study: locks the module
// until this cohort's wave_start. Any error (or no study) → open, so 99% of cohorts
// are unaffected and the app never breaks if the tables aren't migrated.
export async function studyLocksCohort(admin: any, cohortCode: string, now = new Date()): Promise<boolean> {
  try {
    const g = await governingStudy(admin, cohortCode);
    if (!g || g.study.status !== "running" || g.study.design !== "stepped_wedge") return false;
    return !treatmentUnlocked(g.study, g.cohort, now);
  } catch { return false; }
}

// Person → cohort randomization. If `code` is a study's intake code, return the
// cohort this user is (stickily) assigned to: reuse an existing membership in the
// study, else pick an intake-open cohort by a frozen hash of (seed, userId).
export async function resolveStudyIntake(admin: any, code: string, userId: string | null | undefined): Promise<{ isIntake: boolean; cohort: string | null }> {
  const up = String(code || "").toUpperCase().trim();
  if (!up) return { isIntake: false, cohort: null };
  try {
    const { data: study } = await admin.from("studies").select("*").ilike("intake_code", up).maybeSingle();
    if (!study) return { isIntake: false, cohort: null };
    const { data: cohorts } = await admin.from("study_cohorts").select("cohort_code, intake_open").eq("study_id", (study as Study).id);
    const open = ((cohorts || []) as any[]).filter((c) => c.intake_open).map((c) => c.cohort_code);
    if (!open.length) return { isIntake: true, cohort: null };
    if (!userId) return { isIntake: true, cohort: null }; // sign-in required to be randomized

    // Sticky: if already enrolled in one of the study's cohorts, keep it.
    const { data: cls } = await admin.from("classes").select("id, code").in("code", open);
    const idByCode = new Map(((cls || []) as any[]).map((c) => [c.id, c.code]));
    if (idByCode.size) {
      const { data: mem } = await admin.from("class_members").select("class_id").eq("user_id", userId).in("class_id", [...idByCode.keys()]);
      const existing = ((mem || []) as any[]).map((m) => idByCode.get(m.class_id)).filter(Boolean);
      if (existing.length) return { isIntake: true, cohort: existing[0] as string };
    }
    // Assign by frozen hash of (seed, user).
    const ordered = open.slice().sort();
    const idx = Math.floor(hash01((study as Study).seed + ":intake:" + userId) * ordered.length) % ordered.length;
    return { isIntake: true, cohort: ordered[idx] };
  } catch { return { isIntake: false, cohort: null }; }
}

// ---- Cohort-level analysis -------------------------------------------------
// The unit of inference is the COHORT (the unit of randomization), so we aggregate
// each cohort's learners to a cohort mean first, then contrast cohort means. That
// is the conservative, defensible cluster analysis — it can't be fooled by one big
// chatty cohort.
export type StudyArm = { label: string; nCohorts: number; nLearners: number; mean: number | null };
export type StudyResult = {
  design: "cluster" | "stepped_wedge";
  metric: string;
  arms: StudyArm[];
  delta: number | null; se: number | null; lo: number | null; hi: number | null;
  nCohorts: number; nLearners: number;
  note: string;
};

function mean(xs: number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function variance(xs: number[]): number { if (xs.length < 2) return 0; const m = mean(xs); return xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1); }
const r2 = (x: number) => Math.round(x * 100) / 100;

export async function studyImpact(admin: any, studyId: string): Promise<StudyResult | null> {
  const study = await getStudy(admin, studyId);
  if (!study) return null;
  const { data: scohorts } = await admin.from("study_cohorts").select("*").eq("study_id", study.id);
  const cohorts = (scohorts || []) as StudyCohort[];
  const codes = cohorts.map((c) => c.cohort_code);
  const empty: StudyResult = { design: study.design, metric: study.metric, arms: [], delta: null, se: null, lo: null, hi: null, nCohorts: cohorts.length, nLearners: 0, note: "No outcomes yet." };
  if (!codes.length) return empty;

  // Pull the L2 outcome (competence) per finished conversation, tagged by cohort.
  const { data: convs } = await admin.from("conversations")
    .select("cohort, outcome, ended_at").in("cohort", codes).not("outcome", "is", null).not("ended_at", "is", null).limit(50000);
  const rows = ((convs || []) as any[]).filter((r) => typeof r.outcome === "number");
  const nLearners = rows.length;
  if (!nLearners) return { ...empty, nLearners: 0 };

  if (study.design === "cluster") {
    // Per-cohort mean, grouped by the cohort's frozen arm.
    const condByCode = new Map(cohorts.map((c) => [c.cohort_code, c.condition || "treatment"]));
    const byCohort = new Map<string, number[]>();
    for (const r of rows) { const c = r.cohort; if (!byCohort.has(c)) byCohort.set(c, []); byCohort.get(c)!.push(r.outcome); }
    const armMeans = new Map<string, { cohortMeans: number[]; nLearners: number }>();
    for (const [code, vals] of byCohort) {
      const cond = condByCode.get(code) || "treatment";
      if (!armMeans.has(cond)) armMeans.set(cond, { cohortMeans: [], nLearners: 0 });
      const a = armMeans.get(cond)!; a.cohortMeans.push(mean(vals)); a.nLearners += vals.length;
    }
    const arms: StudyArm[] = [...armMeans.entries()].map(([label, a]) => ({ label, nCohorts: a.cohortMeans.length, nLearners: a.nLearners, mean: r2(mean(a.cohortMeans)) }));
    const t = armMeans.get("treatment") || armMeans.get([...armMeans.keys()].find((k) => k !== "control") || "");
    const c = armMeans.get("control");
    let delta = null, se = null, lo = null, hi = null;
    if (t && c && t.cohortMeans.length && c.cohortMeans.length) {
      delta = mean(t.cohortMeans) - mean(c.cohortMeans);
      se = Math.sqrt(variance(t.cohortMeans) / t.cohortMeans.length + variance(c.cohortMeans) / c.cohortMeans.length);
      lo = delta - 1.96 * se; hi = delta + 1.96 * se;
    }
    return { design: "cluster", metric: study.metric, arms, delta: delta == null ? null : r2(delta), se: se == null ? null : r2(se), lo: lo == null ? null : r2(lo), hi: hi == null ? null : r2(hi), nCohorts: byCohort.size, nLearners, note: "Cohort-level contrast (treatment − control) on L2 competence." };
  }

  // stepped_wedge: within each cohort, split its learners into treated (on/after the
  // cohort's wave_start) vs not-yet-treated; the per-cohort difference d_i is the
  // building block, and the estimate is the mean of d_i across cohorts (paired at
  // the unit of randomization).
  const startByCode = new Map(cohorts.map((c) => [c.cohort_code, c.wave_start ? new Date(c.wave_start + "T00:00:00Z").getTime() : null]));
  const perCohort = new Map<string, { t: number[]; u: number[] }>();
  for (const r of rows) {
    const ws = startByCode.get(r.cohort); if (ws == null) continue;
    const treated = new Date(r.ended_at).getTime() >= ws;
    if (!perCohort.has(r.cohort)) perCohort.set(r.cohort, { t: [], u: [] });
    (treated ? perCohort.get(r.cohort)!.t : perCohort.get(r.cohort)!.u).push(r.outcome);
  }
  const diffs: number[] = []; let tN = 0, uN = 0, tCoh = 0, uCoh = 0;
  const tMeans: number[] = [], uMeans: number[] = [];
  for (const [, v] of perCohort) {
    if (v.t.length) { tMeans.push(mean(v.t)); tN += v.t.length; tCoh++; }
    if (v.u.length) { uMeans.push(mean(v.u)); uN += v.u.length; uCoh++; }
    if (v.t.length && v.u.length) diffs.push(mean(v.t) - mean(v.u));
  }
  let delta = null, se = null, lo = null, hi = null;
  if (diffs.length) { delta = mean(diffs); se = Math.sqrt(variance(diffs) / diffs.length); lo = delta - 1.96 * se; hi = delta + 1.96 * se; }
  const arms: StudyArm[] = [
    { label: "treated", nCohorts: tCoh, nLearners: tN, mean: tMeans.length ? r2(mean(tMeans)) : null },
    { label: "not-yet-treated", nCohorts: uCoh, nLearners: uN, mean: uMeans.length ? r2(mean(uMeans)) : null },
  ];
  return { design: "stepped_wedge", metric: study.metric, arms, delta: delta == null ? null : r2(delta), se: se == null ? null : r2(se), lo: lo == null ? null : r2(lo), hi: hi == null ? null : r2(hi), nCohorts: perCohort.size, nLearners, note: "Within-cohort treated − not-yet-treated, averaged across cohorts (paired at the cluster)." };
}
