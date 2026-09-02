// ============================================================================
// Benchmark config types + defaults.
//
// Question TEXT is never stored here — the instructor enters it in-app
// (Facilitator → The Benchmark → Edit questions), and it's saved to the
// service-role-only `benchmark_config` table. This file only carries the
// structure and the pre-wired answer key.
// ============================================================================

export type BenchOption = { key: string; text: string };
export type BenchQuestion = {
  id: number;
  prompt: string;
  options: BenchOption[];
  answer: string; // "A".."E"
};
export type BenchConfig = {
  title: string;
  timeLimitSec: number;
  questions: BenchQuestion[];
  askConfidence?: boolean; // elicit a confidence per answer and score calibration (default on)
};

const ANSWER_KEY = ["B", "D", "A", "A", "E", "D", "A"];

export const DEFAULT_CONFIG: BenchConfig = {
  title: "Logical Reasoning: Diagnostic",
  timeLimitSec: 8 * 60,
  questions: ANSWER_KEY.map((answer, i) => ({
    id: i + 1,
    prompt: "",
    options: ["A", "B", "C", "D", "E"].map((key) => ({ key, text: "" })),
    answer,
  })),
};

export const AI_NOTE =
  "On this kind of reasoning test, a small AI model scores around the 92nd–98th percentile, in minutes, for pennies. The question isn't whether AI can do this. It's what only you can.";

// A specific, performance-aware one-liner for when the AI debrief is unavailable.
// Plain language, no em dashes (per the app copy rule).
export function fallbackNote(score: number, total: number, title?: string): string {
  const pct = total ? score / total : 0;
  const on = title ? ` on ${title}` : "";
  if (pct >= 0.85) return `Excellent work${on}: ${score} of ${total}. You clearly have this down.`;
  if (pct >= 0.6) return `Solid${on}: ${score} of ${total}. A strong base, with a few gaps worth a second look.`;
  if (pct >= 0.35) return `${score} of ${total}${on}. A real start, but several of these tripped you up. Worth another pass.`;
  return `${score} of ${total}${on}. A tough first run. Review the ones you missed and try it again.`;
}

export function configReady(c: BenchConfig): boolean {
  return (
    c.questions.length > 0 &&
    c.questions.every(
      (q) => q.prompt.trim().length > 0 && q.options.every((o) => o.text.trim().length > 0)
    )
  );
}

export function scoreConfig(c: BenchConfig, answers: Record<string, string>): number {
  return c.questions.reduce(
    (s, q) => s + (answers[String(q.id)] === q.answer ? 1 : 0),
    0
  );
}

// Normalize arbitrary saved JSON into a safe BenchConfig.
export function coerceConfig(raw: any): BenchConfig {
  if (!raw || !Array.isArray(raw.questions) || raw.questions.length === 0) {
    return DEFAULT_CONFIG;
  }
  return {
    // The authoring copilot emits "name" (see benchmark-copilot's SCHEMA), so a
    // generated quiz kept its author's title only by accident — it fell through
    // to DEFAULT_CONFIG and every quiz came out "Logical Reasoning: Diagnostic".
    title: String(raw.title || raw.name || DEFAULT_CONFIG.title),
    timeLimitSec: Math.max(30, parseInt(raw.timeLimitSec, 10) || DEFAULT_CONFIG.timeLimitSec),
    askConfidence: raw.askConfidence !== false, // default on
    questions: raw.questions.map((q: any, i: number) => ({
      id: Number(q.id) || i + 1,
      prompt: String(q.prompt || ""),
      options: (Array.isArray(q.options) ? q.options : []).map((o: any, j: number) => ({
        key: String(o.key || ["A", "B", "C", "D", "E"][j] || j),
        text: String(o.text || ""),
      })),
      answer: String(q.answer || "A"),
    })),
  };
}

// ============================================================================
// Calibration: the point of a quiz here is judgment, not just recall. We elicit
// how sure the learner is on each answer, then score how well their confidence
// tracks reality (a proper scoring rule), so a learner can see and improve the
// gap between how sure they feel and how often they're right.
// ============================================================================

export type ConfidenceLevel = { key: string; label: string; p: number };
export const CONFIDENCE_LEVELS: ConfidenceLevel[] = [
  { key: "guess", label: "Guessing", p: 0.5 },
  { key: "lean", label: "Leaning", p: 0.7 },
  { key: "confident", label: "Confident", p: 0.85 },
  { key: "sure", label: "Sure", p: 0.95 },
];
export function pForConfidence(key: string): number {
  return CONFIDENCE_LEVELS.find((l) => l.key === key)?.p ?? 0.5;
}

export type CalibrationBucket = { key: string; label: string; p: number; n: number; correct: number; accuracy: number };
export type Calibration = {
  answered: number;
  brier: number;          // mean squared error of confidence vs outcome (0 best, lower is better)
  meanConfidence: number; // average stated probability, 0..1
  accuracy: number;       // share actually correct, 0..1
  gap: number;            // meanConfidence - accuracy (positive = overconfident)
  verdict: "overconfident" | "underconfident" | "calibrated";
  buckets: CalibrationBucket[];
};

// Score how well a learner's confidence matched their correctness. `confidence`
// maps a question id to a CONFIDENCE_LEVELS key. Correctness is judged against
// the real key (never trust the client for that).
export function computeCalibration(
  c: BenchConfig,
  answers: Record<string, string>,
  confidence: Record<string, string>,
): Calibration | null {
  const rows = c.questions
    .filter((q) => answers[String(q.id)] != null)
    .map((q) => ({
      correct: answers[String(q.id)] === q.answer ? 1 : 0,
      p: pForConfidence(String(confidence[String(q.id)] || "")),
      key: String(confidence[String(q.id)] || ""),
    }))
    .filter((r) => CONFIDENCE_LEVELS.some((l) => l.key === r.key)); // only answered-with-confidence
  if (rows.length === 0) return null;

  const brier = rows.reduce((s, r) => s + (r.p - r.correct) ** 2, 0) / rows.length;
  const meanConfidence = rows.reduce((s, r) => s + r.p, 0) / rows.length;
  const accuracy = rows.reduce((s, r) => s + r.correct, 0) / rows.length;
  const gap = meanConfidence - accuracy;
  const verdict: Calibration["verdict"] = gap > 0.1 ? "overconfident" : gap < -0.1 ? "underconfident" : "calibrated";

  const buckets: CalibrationBucket[] = CONFIDENCE_LEVELS.map((l) => {
    const inBucket = rows.filter((r) => r.key === l.key);
    const correct = inBucket.reduce((s, r) => s + r.correct, 0);
    return { key: l.key, label: l.label, p: l.p, n: inBucket.length, correct, accuracy: inBucket.length ? correct / inBucket.length : 0 };
  }).filter((b) => b.n > 0);

  return { answered: rows.length, brier, meanConfidence, accuracy, gap, verdict, buckets };
}
