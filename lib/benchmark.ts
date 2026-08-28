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
    title: String(raw.title || DEFAULT_CONFIG.title),
    timeLimitSec: Math.max(30, parseInt(raw.timeLimitSec, 10) || DEFAULT_CONFIG.timeLimitSec),
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
