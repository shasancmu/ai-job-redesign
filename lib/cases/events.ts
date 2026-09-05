import { createAdminClient } from "@/lib/supabase/admin";

export type CaseEventKind = "open" | "complete" | "commit" | "link_click" | "ask";

// Record one engagement event. Fails silently — tracking must never break a read.
export async function logCaseEvent(e: {
  slug: string; kind: CaseEventKind; userId?: string | null; anonId?: string | null; cohort?: string | null; data?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("case_events").insert({
      case_slug: e.slug.slice(0, 80),
      user_id: e.userId || null,
      anon_id: e.anonId ? String(e.anonId).slice(0, 64) : null,
      cohort: e.cohort ? String(e.cohort).slice(0, 64) : null,
      kind: e.kind,
      data: e.data || {},
    });
  } catch { /* tracking is best-effort */ }
}

export type CaseInsights = {
  total: number;
  readers: number;
  completed: number;
  completionRate: number; // 0-1
  decisions: { label: string; n: number }[];
  links: { url: string; n: number }[];
  questions: { q: string; when: string }[];
  cohorts: string[];
};

const idOf = (r: any) => r.user_id || r.anon_id || "anon";

// Aggregate engagement for a case (optionally scoped to one cohort tag).
export async function caseInsights(slug: string, cohort?: string | null): Promise<CaseInsights> {
  const empty: CaseInsights = { total: 0, readers: 0, completed: 0, completionRate: 0, decisions: [], links: [], questions: [], cohorts: [] };
  let admin;
  try { admin = createAdminClient(); } catch { return empty; }
  let q = admin.from("case_events").select("user_id, anon_id, cohort, kind, data, created_at").eq("case_slug", slug).order("created_at", { ascending: false }).limit(5000);
  if (cohort) q = q.eq("cohort", cohort);
  const { data } = await q;
  const rows = (data || []) as any[];
  if (!rows.length) return empty;

  const openers = new Set<string>();
  const finishers = new Set<string>();
  const decisions = new Map<string, number>();
  const links = new Map<string, number>();
  const cohorts = new Set<string>();
  const questions: { q: string; when: string }[] = [];

  for (const r of rows) {
    if (r.cohort) cohorts.add(r.cohort);
    const id = idOf(r);
    if (r.kind === "open") openers.add(id);
    else if (r.kind === "commit") {
      finishers.add(id);
      const label = String(r.data?.label || r.data?.choice || "—");
      decisions.set(label, (decisions.get(label) || 0) + 1);
    } else if (r.kind === "complete") finishers.add(id);
    else if (r.kind === "link_click") { const u = String(r.data?.url || ""); if (u) links.set(u, (links.get(u) || 0) + 1); }
    else if (r.kind === "ask") { const question = String(r.data?.q || ""); if (question && questions.length < 40) questions.push({ q: question, when: r.created_at }); }
  }

  const readers = openers.size;
  const completed = finishers.size;
  return {
    total: rows.length,
    readers,
    completed,
    completionRate: readers ? completed / readers : 0,
    decisions: [...decisions.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n),
    links: [...links.entries()].map(([url, n]) => ({ url, n })).sort((a, b) => b.n - a.n).slice(0, 12),
    questions,
    cohorts: [...cohorts].sort(),
  };
}

// ---- Longitudinal / cross-cohort views (the "teaching record") ----

export type CohortRow = { cohort: string; readers: number; completed: number; completionRate: number; topDecision: string | null };

// One case, broken down per class/cohort tag — so an instructor can compare
// sections or terms side by side (the same case taught to different cohorts).
export async function caseCohortBreakdown(slug: string): Promise<CohortRow[]> {
  let admin;
  try { admin = createAdminClient(); } catch { return []; }
  const { data } = await admin.from("case_events").select("user_id, anon_id, cohort, kind, data").eq("case_slug", slug).limit(10000);
  const rows = (data || []) as any[];
  const byCohort = new Map<string, { open: Set<string>; done: Set<string>; dec: Map<string, number> }>();
  for (const r of rows) {
    const c = r.cohort || "(untagged)";
    const g = byCohort.get(c) || { open: new Set<string>(), done: new Set<string>(), dec: new Map<string, number>() };
    const id = idOf(r);
    if (r.kind === "open") g.open.add(id);
    else if (r.kind === "commit") { g.done.add(id); const l = String(r.data?.label || r.data?.choice || "—"); g.dec.set(l, (g.dec.get(l) || 0) + 1); }
    else if (r.kind === "complete") g.done.add(id);
    byCohort.set(c, g);
  }
  return [...byCohort.entries()].map(([cohort, g]) => {
    const readers = g.open.size, completed = g.done.size;
    const top = [...g.dec.entries()].sort((a, b) => b[1] - a[1])[0];
    return { cohort, readers, completed, completionRate: readers ? completed / readers : 0, topDecision: top ? top[0] : null };
  }).sort((a, b) => b.readers - a.readers);
}

export type TeachingRecord = {
  totals: { cases: number; readers: number; completed: number; cohorts: number };
  perCase: { slug: string; name: string; readers: number; completed: number; cohorts: number }[];
};

// Across all of an instructor's cases: how many students read them, decided, and
// how many distinct classes engaged. The cross-case "teaching record" surface.
export async function teachingRecord(cases: { slug: string; name: string }[]): Promise<TeachingRecord> {
  const empty: TeachingRecord = { totals: { cases: cases.length, readers: 0, completed: 0, cohorts: 0 }, perCase: [] };
  if (!cases.length) return empty;
  let admin;
  try { admin = createAdminClient(); } catch { return empty; }
  const slugs = cases.map((c) => c.slug);
  const { data } = await admin.from("case_events").select("case_slug, user_id, anon_id, cohort, kind").in("case_slug", slugs).limit(20000);
  const rows = (data || []) as any[];
  const per = new Map<string, { open: Set<string>; done: Set<string>; cohorts: Set<string> }>();
  const allReaders = new Set<string>(), allDone = new Set<string>(), allCohorts = new Set<string>();
  for (const r of rows) {
    const g = per.get(r.case_slug) || { open: new Set<string>(), done: new Set<string>(), cohorts: new Set<string>() };
    const id = idOf(r);
    if (r.cohort) { g.cohorts.add(r.cohort); allCohorts.add(r.cohort); }
    if (r.kind === "open") { g.open.add(id); allReaders.add(`${r.case_slug}:${id}`); }
    else if (r.kind === "commit" || r.kind === "complete") { g.done.add(id); allDone.add(`${r.case_slug}:${id}`); }
    per.set(r.case_slug, g);
  }
  const perCase = cases.map((c) => {
    const g = per.get(c.slug);
    return { slug: c.slug, name: c.name, readers: g?.open.size || 0, completed: g?.done.size || 0, cohorts: g?.cohorts.size || 0 };
  }).sort((a, b) => b.readers - a.readers);
  return { totals: { cases: cases.length, readers: allReaders.size, completed: allDone.size, cohorts: allCohorts.size }, perCase };
}
