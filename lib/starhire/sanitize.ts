// Turn the AI's proposed hiring scenario into a valid HiddenScenario plus the
// answer-free ObservableScenario the student sees. Repairs the usual LLM messes
// (missing/duplicate ids, out-of-range numbers, malformed weights) and guarantees
// the pieces grading and roleplay depend on.

import type { HiddenScenario, ObservableScenario, HiddenCandidate, ObservableCandidate, HcType } from "./types";

const HC: HcType[] = ["general", "strategic", "industry", "relationship"];
const ARCHES = new Set(["star_trap", "best_fit", "solid", "specialist", "internal", "journeyman"]);

const num = (x: any, d: number) => (isFinite(Number(x)) ? Number(x) : d);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const str = (x: any, d = "") => (typeof x === "string" && x.trim() ? x.trim() : d);

function slug(s: string, fallback: string): string {
  const o = String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return o || fallback;
}

export function sanitizeScenario(raw: any, meta: { context: string; difficulty: "easy" | "hard" }): { hidden: HiddenScenario; observable: ObservableScenario } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "AI returned no usable scenario." };

  const firm = {
    name: str(raw?.firm?.name, "the firm"),
    sector: str(raw?.firm?.sector, meta.context),
    oneLiner: str(raw?.firm?.oneLiner, ""),
  };
  const role = {
    title: str(raw?.role?.title, "the role"),
    brief: str(raw?.role?.brief, ""),
  };

  // role weights over the four transferable HC types, normalized
  const rwRaw: any = raw?.roleWeights || {};
  let rw: Record<HcType, number> = { general: Math.abs(num(rwRaw.general, 0.25)), strategic: Math.abs(num(rwRaw.strategic, 0.25)), industry: Math.abs(num(rwRaw.industry, 0.25)), relationship: Math.abs(num(rwRaw.relationship, 0.25)) };
  const wsum = HC.reduce((s, t) => s + rw[t], 0) || 1;
  rw = { general: rw.general / wsum, strategic: rw.strategic / wsum, industry: rw.industry / wsum, relationship: rw.relationship / wsum };

  const rawCands = Array.isArray(raw?.candidates) ? raw.candidates.slice(0, 5) : [];
  if (rawCands.length < 3) return { error: "AI scenario had too few candidates." };

  const ids = new Set<string>();
  const hidden: HiddenCandidate[] = [];
  const observable: ObservableCandidate[] = [];
  rawCands.forEach((c: any, i: number) => {
    let id = slug(c?.id || c?.name || "", `c${i + 1}`);
    if (ids.has(id)) id = `${id}-${i + 1}`;
    ids.add(id);
    const name = str(c?.name, `Candidate ${i + 1}`);
    const hc: Record<HcType, number> = { general: clamp(num(c?.hc?.general, 50), 0, 100), strategic: clamp(num(c?.hc?.strategic, 50), 0, 100), industry: clamp(num(c?.hc?.industry, 50), 0, 100), relationship: clamp(num(c?.hc?.relationship, 50), 0, 100) };
    const probes = (Array.isArray(c?.probes) ? c.probes : []).slice(0, 6).map((p: any) => ({ q: str(p?.q, ""), value: (p?.value === "high" || p?.value === "med" || p?.value === "low" ? p.value : "med") as "high" | "med" | "low" })).filter((p: any) => p.q);
    hidden.push({
      id, name,
      archetype: ARCHES.has(c?.archetype) ? c.archetype : "solid",
      hc,
      companyPrior: clamp(num(c?.companyPrior, 40), 0, 100),
      firmEffect: clamp(num(c?.firmEffect, 40), 0, 100),
      portableFraction: clamp(num(c?.portableFraction, 0.6), 0, 1),
      matchEffect: clamp(num(c?.matchEffect, 0), -30, 30),
      wage: Math.max(0, num(c?.wage, 100)),
      tailRisk: clamp(num(c?.tailRisk, 0.2), 0, 1),
      observedRating: clamp(num(c?.observedRating, 60), 0, 100),
      tell: str(c?.tell, ""),
      probes,
    });
    observable.push({
      id, name,
      headline: str(c?.headline, name),
      resume: (Array.isArray(c?.resume) ? c.resume : []).slice(0, 6).map((b: any) => str(b, "")).filter(Boolean),
      ask: str(c?.ask, ""),
    });
  });
  if (hidden.length < 3) return { error: "AI scenario had too few valid candidates." };

  const hiddenScenario: HiddenScenario = {
    context: meta.context, difficulty: meta.difficulty,
    firm, role, roleWeights: rw, candidates: hidden,
    principle: str(raw?.principle, ""),
  };
  const observableScenario: ObservableScenario = {
    context: meta.context, difficulty: meta.difficulty,
    firm, role, candidates: observable,
  };
  return { hidden: hiddenScenario, observable: observableScenario };
}
