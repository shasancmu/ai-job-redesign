// Stickiness helpers: a gentle activity streak, where each module's saved
// artifact lives, and what to do next. Kept framework-light — this is a
// decision-moment tool, so momentum is about a growing personal asset + a clear
// next step, not daily-loop pressure.

import { MODULES, byCatalogOrder, moduleByExercise, moduleBySlug, moduleCategory, type ModuleDef } from "@/lib/modules";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const weekIndex = (t: number) => Math.floor(t / WEEK);

// Consecutive-week streak with a one-week grace (so someone active last week
// keeps their streak). Returns the current streak and the best ever seen.
export function computeStreak(timestamps: (string | number | Date)[]): { current: number; best: number } {
  const weeks = new Set<number>();
  for (const t of timestamps) {
    const ms = new Date(t).getTime();
    if (Number.isFinite(ms)) weeks.add(weekIndex(ms));
  }
  if (weeks.size === 0) return { current: 0, best: 0 };

  const now = weekIndex(Date.now());
  let anchor = weeks.has(now) ? now : weeks.has(now - 1) ? now - 1 : null;
  let current = 0;
  if (anchor !== null) {
    let w = anchor;
    while (weeks.has(w)) { current++; w--; }
  }

  const sorted = [...weeks].sort((a, b) => a - b);
  let best = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current, best: Math.max(best, current) };
}

// Where a finished module's artifact lives (the thing worth revisiting).
export function artifactHref(exercise: string, code: string): string {
  if (exercise === "workflow" || exercise === "workflow-solo") return `/workflow-plan/${code}`;
  if (exercise === "solo") return `/plan/${code}`;
  if (["gas", "ocfit", "experiment", "four-a", "scorecard", "venture", "deeptech", "paper-idea", "paper-structure", "paper-points", "research-quality", "reg-tables", "research-graphs", "lit-review", "vrino", "data-strategy", "identification", "referee", "rnr", "journal-fit", "theory", "abstract", "research-system", "research-team"].includes(exercise)) return `/canvas/${code}`;
  if (exercise === "interaction") return `/interaction/${code}`;
  if (exercise === "field-experiment") return `/experiment/${code}`;
  if (exercise.startsWith("custom:")) return `/canvas/${code}`;
  if (exercise === "career-xray" || exercise === "jd-xray") return `/career/${code}`;
  if (exercise === "career-roadmap") return `/roadmap/${code}`;
  if (exercise === "consult" || exercise === "voice-consult") return `/consult/${code}`;
  if (exercise === "vision" || exercise === "vision-voice") return `/vision/${code}`;
  if (exercise === "superpower") return `/superpower/${code}`;
  if (exercise === "personal-network") return `/network-map/${code}`;
  if (exercise === "domain-brief") return `/domain-brief/${code}`;
  if (exercise === "collaborators") return `/collaborators/${code}`;
  if (exercise === "licensing-brief") return `/licensing/${code}`;
  if (exercise === "score-invention") return `/invention/${code}`;
  if (exercise === "position-research") return `/position/${code}`;
  if (exercise === "rank-disclosures") return `/disclosures-rank/${code}`;
  if (exercise === "find-cofounder") return `/cofounder/${code}`;
  if (exercise === "earnings-call") return `/earnings/${code}`;
  if (exercise === "hot-seat") return `/hotseat/${code}`;
  if (exercise === "diligence-science") return `/diligence/${code}`;
  if (["tech-landscape", "deal-sourcing", "commercialization-scorecard", "field-trajectory"].includes(exercise)) return `/scan/${code}`;
  if (exercise === "resume" || exercise === "resume-voice") return `/resume/${code}`;
  if (exercise === "myopia-business" || exercise === "myopia-career") return `/myopia/${code}`;
  if (exercise === "board") return `/board/${code}`;
  if (exercise === "pipeline") return `/pipeline/${code}`;
  if (exercise === "paper-study") return `/paper-study/${code}`;
  if (exercise === "regression-detective") return `/regression/${code}`;
  if (exercise === "disclosure" || exercise === "disclosure-haip") return `/disclosure/${code}`;
  return `/room/${code}`;
}

// The natural next step after finishing a module — an explicit learning path,
// falling back to the person's segment/goal recommendations.
const NEXT_AFTER: Record<string, string> = {
  "career-x-ray": "career-roadmap",
  "career-roadmap": "close-the-offer",
  "jd-x-ray": "career-roadmap",
  "solo-ai": "career-x-ray",
  "reimagine-job": "solo-ai",
  "reimagine-workflow": "workflow-solo",
  "workflow-solo": "ai-canvas",
  "ai-canvas": "opportunity-capability",
  "opportunity-capability": "good-business",
  "good-business": "test-the-bet",
  "test-the-bet": "balanced-scorecard",
  "balanced-scorecard": "execution-4a",
  "execution-4a": "opportunity-capability",
  "deeptech-canvas": "good-business",
  "close-the-offer": "name-your-price",
  // Research & scholarship — the curriculum order.
  "publication-pipeline": "read-the-interaction",
  "read-the-interaction": "strategy-experiment",
  "strategy-experiment": "good-research",
  "good-research": "theory-section",
  "theory-section": "understand-a-paper",
  "understand-a-paper": "paper-structure",
  "paper-structure": "making-points",
  "making-points": "abstract-title",
  "abstract-title": "literature-reviews",
  "literature-reviews": "data-moat",
  "data-moat": "data-strategy",
  "data-strategy": "identification",
  "identification": "regression-tables",
  "regression-tables": "research-graphs",
  "research-graphs": "the-referee",
  "the-referee": "revise-resubmit",
  "revise-resubmit": "journal-fit",
  "journal-fit": "research-system",
  "research-system": "research-team",
  // The PhD path.
  "what-is-a-phd": "choose-phd-program",
  "choose-phd-program": "phd-application",
  "phd-application": "phd-structure",
  "phd-structure": "phd-succeed",
  "phd-succeed": "phd-placement",
  // How AI works (the series).
  "ai-rules": "ai-learning",
  "ai-learning": "ai-language",
  "ai-language": "ai-scale",
};

// The very next module in an explicit learning path (used by the explainer
// lessons to push straight into the next one when a lesson is finished).
export function nextAfter(slug: string): string | null {
  return NEXT_AFTER[slug] || null;
}

// A single "what to run next" suggestion for the completion moment: the explicit
// learning-path next if it exists, else the next module in the same category.
// Returns null for custom or unmapped modules (the caller shows a generic nudge).
export function recommendedNext(exercise: string): ModuleDef | null {
  const cur = moduleByExercise(exercise);
  if (!cur) return null;
  const nxt = NEXT_AFTER[cur.slug];
  if (nxt) {
    const m = moduleBySlug(nxt);
    if (m && !m.hidden) return m;
  }
  const cat = moduleCategory(cur.slug);
  const inCat = MODULES.filter((m) => !m.hidden && moduleCategory(m.slug) === cat).sort(byCatalogOrder);
  const idx = inCat.findIndex((m) => m.slug === cur.slug);
  if (idx >= 0 && idx < inCat.length - 1) return inCat[idx + 1];
  if (inCat.length && inCat[0].slug !== cur.slug) return inCat[0];
  return null;
}

export function nextStep(completed: Set<string>, recommended: string[], valid: Set<string>): string | null {
  for (const slug of completed) {
    const nxt = NEXT_AFTER[slug];
    if (nxt && !completed.has(nxt) && valid.has(nxt)) return nxt;
  }
  for (const slug of recommended) if (!completed.has(slug) && valid.has(slug)) return slug;
  return null;
}

export function timeAgo(t: string | number | Date): string {
  const ms = Date.now() - new Date(t).getTime();
  const d = Math.floor(ms / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} week${w > 1 ? "s" : ""} ago`;
  const mo = Math.floor(d / 30);
  return `${mo} month${mo > 1 ? "s" : ""} ago`;
}
