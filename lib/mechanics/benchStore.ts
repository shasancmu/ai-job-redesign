// Store + hygiene for authored benchmarks. A BenchConfig (timed MCQ + answer
// key) is already the spec; scoreConfig() scores it. Answers are stripped for
// the client and scoring happens server-side.
import { coerceConfig, type BenchConfig } from "@/lib/benchmark";
import { makeSpecLoader, makeCatalogLister } from "@/lib/mechanics/specStore";

export const getBenchConfig = makeSpecLoader<BenchConfig>("benchmark_specs", { coerce: coerceConfig });

export type BenchCatalogEntry = { slug: string; name: string; count: number };
export const listBenchCatalog = makeCatalogLister<BenchCatalogEntry>(
  "benchmark_specs",
  (r) => ({ slug: r.slug, name: r.spec?.name || r.slug, count: (r.spec?.questions || []).length }),
);

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
