// Store + hygiene for authored benchmarks. A BenchConfig (timed MCQ + answer
// key) is already the spec; scoreConfig() scores it. Answers are stripped for
// the client and scoring happens server-side.
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { coerceConfig, type BenchConfig } from "@/lib/benchmark";

async function getBenchConfigUncached(slug: string): Promise<BenchConfig | null> {
  try {
    const { data } = await createAdminClient()
      .from("benchmark_specs").select("spec").eq("slug", String(slug || "").toLowerCase())
      .order("version", { ascending: false }).limit(1).maybeSingle();
    if (data?.spec) return coerceConfig(data.spec);
  } catch { /* table missing */ }
  return null;
}

// Request-scoped memo: the page and its generateMetadata both need the spec,
// and cache() collapses that into a single query per request.
export const getBenchConfig = cache(getBenchConfigUncached);

export type BenchCatalogEntry = { slug: string; name: string; count: number };
export async function listBenchCatalog(ownerId?: string): Promise<BenchCatalogEntry[]> {
  try {
    const admin = createAdminClient();
    let q = admin.from("benchmark_specs").select("slug, spec, owner_id").eq("status", "published").order("updated_at", { ascending: false });
    if (ownerId) q = q.eq("owner_id", ownerId);
    const { data } = await q;
    const seen = new Set<string>();
    const out: BenchCatalogEntry[] = [];
    for (const r of ((data as any[]) || [])) { if (seen.has(r.slug)) continue; seen.add(r.slug); out.push({ slug: r.slug, name: r.spec?.name || r.slug, count: (r.spec?.questions || []).length }); }
    return out;
  } catch { return []; }
}

// Client-safe: no answer key.
export function publicBenchConfig(c: BenchConfig): any {
  return {
    name: (c as any).name || "Quiz",
    timeLimitSec: c.timeLimitSec,
    askConfidence: c.askConfidence !== false,
    questions: c.questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options.map((o) => ({ key: o.key, text: o.text })) })),
  };
}

export function validateBenchConfig(c: any): string[] {
  const e: string[] = [];
  if (!c || typeof c !== "object") return ["Not a valid benchmark."];
  if (!c.slug || !/^[a-z0-9-]+$/.test(c.slug)) e.push("Give it a lowercase-with-dashes slug.");
  if (!c.name || c.name.length < 3) e.push("Give it a name.");
  if (!Number.isFinite(c.timeLimitSec) || c.timeLimitSec < 30) e.push("Set a time limit of at least 30 seconds.");
  const qs = Array.isArray(c.questions) ? c.questions : [];
  if (qs.length < 1) e.push("Add at least one question.");
  qs.forEach((q: any, i: number) => {
    if (!q.prompt || !q.prompt.trim()) e.push(`Question ${i + 1} needs a prompt.`);
    const opts = Array.isArray(q.options) ? q.options : [];
    if (opts.length < 2) e.push(`Question ${i + 1} needs at least 2 options.`);
    if (opts.some((o: any) => !o.text || !o.text.trim())) e.push(`Question ${i + 1} has an empty option.`);
    if (!opts.some((o: any) => o.key === q.answer)) e.push(`Question ${i + 1}'s answer must match one of its option keys.`);
  });
  return e;
}
