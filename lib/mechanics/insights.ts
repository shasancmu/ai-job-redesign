// Observe -> improve: aggregate a module's persisted runs into a few signals the
// author can act on, and tie the weakest one to a specific probe. Server-only
// (service role); returns plain data for the editor's Insights tab.
import { createAdminClient } from "@/lib/supabase/admin";
import { getSpec } from "@/lib/mechanics/store";

export type ProbeStat = { key: string; label: string; askRate: number; highValue: boolean };
export type Insights = {
  runs: number;
  avgScore: number | null;
  correctPct: number | null;
  calibration: { label: string; count: number }[];
  probes: ProbeStat[];
  weakest: ProbeStat | null; // the highest-value probe learners ask least
};

function norm(s: any): string {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// The distinct cohort codes that have runs for this module, for the class filter.
export async function listResultCohorts(slug: string): Promise<string[]> {
  try {
    const { data } = await createAdminClient().from("roleplay_results").select("cohort").eq("slug", slug).not("cohort", "is", null).limit(1000);
    return [...new Set(((data as any[]) || []).map((r) => r.cohort).filter(Boolean).map(String))].sort();
  } catch { return []; }
}

export async function getInsights(slug: string, cohort?: string | null): Promise<Insights | null> {
  try {
    const admin = createAdminClient();
    let q = admin
      .from("roleplay_results")
      .select("report, score")
      .eq("slug", slug)
      .order("created_at", { ascending: false })
      .limit(500);
    if (cohort) q = q.eq("cohort", cohort);
    const { data } = await q;
    const rows = data || [];
    const runs = rows.length;

    const spec = await getSpec(slug);
    const probeDefs = (spec?.probes || []).map((p: any) => ({ key: p.key, label: p.label || p.key }));
    // which probes are high-value in at least one scenario
    const highValue = new Set<string>();
    for (const s of spec?.scenarios || []) for (const d of (s as any).dimensions || []) if (d.value === "high") highValue.add(d.probe);

    if (runs === 0) {
      return { runs: 0, avgScore: null, correctPct: null, calibration: [], weakest: null,
        probes: probeDefs.map((p) => ({ key: p.key, label: p.label, askRate: 0, highValue: highValue.has(p.key) })) };
    }

    // score + correctness + calibration
    const scores = rows.map((r: any) => (typeof r.score === "number" ? r.score : r.report?.score)).filter((n: any) => typeof n === "number");
    const avgScore = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null;
    let correct = 0, verdicted = 0;
    const calib: Record<string, number> = {};
    for (const r of rows) {
      const rep = r.report || {};
      if (typeof rep.verdict_correct === "boolean") { verdicted++; if (rep.verdict_correct) correct++; }
      if (rep.calibration) calib[String(rep.calibration)] = (calib[String(rep.calibration)] || 0) + 1;
    }
    const correctPct = verdicted ? Math.round((correct / verdicted) * 100) : null;
    const calibration = Object.entries(calib).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

    // per-probe ask rate, from each run's info_map [{probe, value, asked}]
    const askCount: Record<string, number> = {};
    for (const p of probeDefs) askCount[p.key] = 0;
    for (const r of rows) {
      const map = (r.report?.info_map || []) as any[];
      for (const p of probeDefs) {
        const hit = map.find((m) => { const mp = norm(m.probe); return mp === norm(p.key) || mp === norm(p.label) || (mp && (mp.includes(norm(p.key)) || norm(p.label).includes(mp))); });
        if (hit && (hit.asked === true || hit.asked === "true")) askCount[p.key]++;
      }
    }
    const probes: ProbeStat[] = probeDefs.map((p) => ({ key: p.key, label: p.label, askRate: Math.round((askCount[p.key] / runs) * 100), highValue: highValue.has(p.key) }));
    const weakest = probes.filter((p) => p.highValue).sort((a, b) => a.askRate - b.askRate)[0] || null;

    return { runs, avgScore, correctPct, calibration, probes, weakest };
  } catch {
    return null; // table not migrated yet
  }
}
