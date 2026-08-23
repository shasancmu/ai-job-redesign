// ============================================================================
// Publication Pipeline — the numbers game behind getting papers published,
// from Sharique Hasan's "Topics in Strategy" lecture. Peer review is a lottery:
// n reviewers each accept with probability p, an editor aggregates their votes,
// and a paper cycles through journals until it lands or you kill it. This module
// turns that model into a personal pipeline plan. The math is pure + client-side
// so the simulation runs live; the AI layer only interprets the result.
// ============================================================================

export type PipelineStep = { key: string; title: string; minutes: number };
export const PIPELINE_STEPS: PipelineStep[] = [
  { key: "process", title: "How publication actually works", minutes: 4 },
  { key: "inputs", title: "Your situation", minutes: 3 },
  { key: "results", title: "The lever", minutes: 6 },
];

// The editorial process: a series of filters. Structure varies by journal, but
// the shape is the same. This is the (a) "how it works" the module teaches
// before any numbers.
export type Stage = { role: string; what: string; filter: string };
export const PIPELINE_STAGES: Stage[] = [
  { role: "You submit", what: "You choose a journal and submit. Fit matters: the wrong venue is a fast rejection.", filter: "Fit" },
  { role: "Managing editor", what: "Administrative checks and basic screens — scope, formatting, plagiarism. Off-topic papers are returned.", filter: "Scope & integrity" },
  { role: "Deputy editor", what: "Assigns the paper to a handling editor, and can desk-reject anything that won't clear the bar.", filter: "Desk reject" },
  { role: "Senior (handling) editor", what: "Reads it and decides whether it's worth reviewers' time, then recruits two to four referees.", filter: "Worth reviewing?" },
  { role: "Reviewers", what: "Write detailed referee reports with a recommendation. This is where papers are truly won or lost.", filter: "The reports" },
  { role: "Senior editor aggregates", what: "Weighs the reports and the paper, and makes a decision or recommendation: reject, revise & resubmit, or (rarely) accept.", filter: "Recommendation" },
  { role: "Deputy editor decides", what: "Makes or confirms the final decision. Most accepted papers survived at least one revise & resubmit.", filter: "Final call" },
];

// At top journals, half or more are desk-rejected before review; the overall
// acceptance rate is 3–5% or lower.
export const FUNNEL_NOTE =
  "At top journals, half or more never reach review, and the overall acceptance rate is 3 to 5 percent or lower. Every stage is a filter — and reviewers are the one you can most affect.";

export type Quality = "solid" | "good" | "verygood" | "exceptional";
// Quality = how likely reviewers are to champion the paper. This is p, and it is
// the lever: raising it (convincing reviewers) is the only thing that moves the
// numbers, because you cannot out-write a 3–5% acceptance rate.
export const QUALITY: { key: Quality; label: string; p: number; note: string }[] = [
  { key: "solid", label: "Solid, not yet a standout", p: 0.12, note: "A real contribution reviewers respect but don't fight for." },
  { key: "good", label: "Good — taken seriously", p: 0.2, note: "Reviewed carefully at strong journals." },
  { key: "verygood", label: "Very good — reviewers argue to accept", p: 0.3, note: "A referee becomes an advocate." },
  { key: "exceptional", label: "Exceptional — reviewers champion it", p: 0.42, note: "A paper that helps define a field." },
];

export type PipelineInputs = {
  target: number; // publications you want (tenure ~ 6)
  years: number; // over how many years (tenure ~ 8)
  quality: Quality; // how likely reviewers are to champion it — the lever
  reviewers: number; // n
  maxJournals: number; // K: how many journals before you kill a paper
  cycleMonths: number; // one journal's submit-to-decision cycle
  pace: number; // papers you START per year
};

export const DEFAULT_INPUTS: PipelineInputs = {
  target: 6, // a common tenure bar
  years: 8,
  quality: "good",
  reviewers: 3,
  maxJournals: 4,
  cycleMonths: 6,
  pace: 2,
};

function nCr(n: number, k: number): number {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}
function binomAtLeast(k: number, n: number, p: number): number {
  let s = 0;
  for (let i = k; i <= n; i++) s += nCr(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
  return s;
}

export type PipelineResult = {
  perReviewer: number; // p
  singleJournal: number; // acceptance probability at one journal
  everPublished: number; // probability a paper lands within K journals
  papersToWrite: number; // to bank `target` publications
  avgSubmissions: number; // submissions per paper until accept-or-kill
  monthsPerPaper: number; // expected review journey
  inFlight: number; // papers to keep in flight at once (Little's law)
  paceNeeded: number; // papers/year to hit target within `years`
  onTrack: boolean;
};

// The core model. An editor accepts on a majority of reviewers half the time and
// demands unanimity the other half — a simple stand-in for editor variance that
// reproduces sub-10% top-journal odds from realistic per-reviewer probabilities.
export function simulate(inp: PipelineInputs): PipelineResult {
  const p = QUALITY.find((q) => q.key === inp.quality)?.p ?? 0.2;
  const n = Math.max(1, Math.round(inp.reviewers));
  const majority = binomAtLeast(Math.ceil((n + 1) / 2), n, p);
  const unanimous = Math.pow(p, n);
  const pSub = 0.5 * majority + 0.5 * unanimous;
  const K = Math.max(1, Math.round(inp.maxJournals));

  const everPub = 1 - Math.pow(1 - pSub, K);
  const papersToWrite = everPub > 0 ? Math.ceil(inp.target / everPub) : Infinity;

  let avgSubs = 0;
  for (let i = 1; i <= K; i++) avgSubs += i * Math.pow(1 - pSub, i - 1) * pSub;
  avgSubs += K * Math.pow(1 - pSub, K); // the killed path: K submissions, no acceptance
  const monthsPerPaper = avgSubs * inp.cycleMonths;
  const inFlight = Math.max(1, Math.round(inp.pace * (monthsPerPaper / 12)));
  const paceNeeded = inp.years > 0 ? papersToWrite / inp.years : papersToWrite;

  return {
    perReviewer: p,
    singleJournal: pSub,
    everPublished: everPub,
    papersToWrite,
    avgSubmissions: avgSubs,
    monthsPerPaper,
    inFlight,
    paceNeeded,
    onTrack: inp.pace >= paceNeeded,
  };
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

// The lever. Holding the target fixed, how many papers you'd have to WRITE
// collapses as your per-paper odds rise (i.e. as you convince reviewers) — and
// barely moves as you write faster. This is the module's whole point.
export function leverTable(inp: PipelineInputs): { key: Quality; label: string; everPublished: number; papersToWrite: number }[] {
  return QUALITY.map((q) => {
    const r = simulate({ ...inp, quality: q.key });
    return { key: q.key, label: q.label, everPublished: r.everPublished, papersToWrite: r.papersToWrite };
  });
}

// Could you even physically write that many in the time you have, at your pace?
export function feasibleByVolume(inp: PipelineInputs, papersToWrite: number): boolean {
  return papersToWrite <= inp.pace * inp.years;
}

// The "papers written → publications" curve (the lecture's simulation figure):
// expected cumulative publications as you write more papers, at this everPublished rate.
export function curve(everPublished: number, maxPapers = 15): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let x = 0; x <= maxPapers; x++) pts.push({ x, y: x * everPublished });
  return pts;
}
