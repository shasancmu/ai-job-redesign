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
