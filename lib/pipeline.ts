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
  { key: "inputs", title: "Your situation", minutes: 4 },
  { key: "results", title: "The odds, and your pipeline", minutes: 8 },
];

export type Quality = "solid" | "good" | "verygood" | "exceptional";
export const QUALITY: { key: Quality; label: string; p: number; note: string }[] = [
  { key: "solid", label: "Solid, still developing", p: 0.12, note: "A real contribution that isn't yet a standout." },
  { key: "good", label: "Good, competitive", p: 0.2, note: "Reviewed seriously at strong journals." },
  { key: "verygood", label: "Very good", p: 0.3, note: "The kind reviewers argue to accept." },
  { key: "exceptional", label: "Exceptional", p: 0.42, note: "A paper that helps define a field." },
];

export type PipelineInputs = {
  target: number; // publications you want
  years: number; // over how many years
  quality: Quality; // maps to per-reviewer accept probability p
  reviewers: number; // n
  maxJournals: number; // K: how many journals before you kill a paper
  cycleMonths: number; // one journal's submit-to-decision cycle
  pace: number; // papers you START per year
};

export const DEFAULT_INPUTS: PipelineInputs = {
  target: 5,
  years: 6,
  quality: "verygood",
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

// The "papers written → publications" curve (the lecture's simulation figure):
// expected cumulative publications as you write more papers, at this everPublished rate.
export function curve(everPublished: number, maxPapers = 15): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let x = 0; x <= maxPapers; x++) pts.push({ x, y: x * everPublished });
  return pts;
}
