// ============================================================================
// Timed benchmark config.
//
// The answer key is pre-wired (B, D, A, A, E, D, A). To make the module usable,
// paste each question's passage into `prompt` and its five choices into
// `options[].text` below. (The LSAT April 2025 questions are LSAC-copyrighted —
// paste from your licensed copy, or swap in your own / licensed questions.)
//
// `timeLimitSec` controls the countdown for the whole set — tune to taste.
// ============================================================================

export type BenchOption = { key: string; text: string };
export type BenchQuestion = {
  id: number;
  prompt: string;
  options: BenchOption[];
  answer: string; // "A".."E"
};

const ANSWER_KEY = ["B", "D", "A", "A", "E", "D", "A"];

export const BENCHMARK = {
  title: "Logical Reasoning — Diagnostic",
  intro:
    "Seven logical-reasoning questions. For each, pick the single best answer. You're timed — work quickly and carefully.",
  timeLimitSec: 8 * 60, // 8 minutes for 7 questions — change as you like
  source: "LSAT, April 2025 (Form LTDA03). For licensed educational use.",
  aiNote:
    "On this kind of reasoning test, a small AI model scores around the 92nd–98th percentile — in minutes, for pennies. The question isn't whether AI can do this. It's what only you can.",
  questions: ANSWER_KEY.map<BenchQuestion>((answer, i) => ({
    id: i + 1,
    prompt: "", // ← paste Question ${i+1}'s passage/stem here
    options: ["A", "B", "C", "D", "E"].map((key) => ({ key, text: "" })), // ← paste each choice
    answer,
  })),
};

export const BENCHMARK_TOTAL = BENCHMARK.questions.length;

// True once the questions have actually been filled in.
export const BENCHMARK_READY = BENCHMARK.questions.every(
  (q) => q.prompt.trim().length > 0 && q.options.every((o) => o.text.trim().length > 0)
);

export function scoreAnswers(answers: Record<string, string>): number {
  return BENCHMARK.questions.reduce(
    (s, q) => s + (answers[String(q.id)] === q.answer ? 1 : 0),
    0
  );
}
