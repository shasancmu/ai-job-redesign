import { createClient } from "@/lib/supabase/server";
import { scoreConfig, fallbackNote } from "@/lib/benchmark";
import { getBenchConfig } from "@/lib/mechanics/benchStore";
import { AI_ENABLED, benchmarkNoteAI, benchmarkSolveAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const SOLVE_SYSTEM = `You are taking a timed multiple-choice test. For every question, pick the single best answer. Do not skip any. Return ONLY JSON: {"answers": {"<questionId>": "<optionKey>"}} using each question's id and one option key (like "A"). No prose.`;

const NOTE_SYSTEM = `You give a ONE-sentence debrief on a "you vs AI" benchmark the learner just finished. You know their score, the AI's score on the same test, and which questions they missed. Be specific to the topic and honest about the gap. If the AI beat them, frame it plainly: on recall and pattern tasks like these AI is strong, so their edge is the judgment these questions can't test. If they matched or beat the AI, say so. Warm and direct. Under 30 words. Plain language, no jargon, no em dashes. Return only the sentence.`;

// Score a benchmark server-side (the key never reaches the client) AND run a
// small AI model on the same questions, so the result is a real you-vs-AI
// comparison with a debrief specific to this module and the learner's answers.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const cfg = await getBenchConfig(String(body.slug || ""));
  if (!cfg) return Response.json({ error: "unknown benchmark" }, { status: 400 });
  const answers = (body.answers && typeof body.answers === "object") ? body.answers : {};
  const score = scoreConfig(cfg, answers);
  const total = cfg.questions.length;

  // The AI takes the same test (no answer key given to it).
  let aiScore: number | null = null;
  if (AI_ENABLED) {
    try {
      const quiz = cfg.questions.map((q) => ({
        id: q.id,
        question: q.prompt,
        options: q.options.map((o) => ({ key: o.key, text: o.text })),
      }));
      const solved = await benchmarkSolveAI(SOLVE_SYSTEM, JSON.stringify({ questions: quiz }));
      const raw = solved?.answers && typeof solved.answers === "object" ? solved.answers : {};
      const aiAnswers: Record<string, string> = {};
      for (const q of cfg.questions) {
        const v = raw[String(q.id)] ?? raw[q.id];
        if (typeof v === "string") aiAnswers[String(q.id)] = v.trim().charAt(0).toUpperCase();
      }
      if (Object.keys(aiAnswers).length) aiScore = scoreConfig(cfg, aiAnswers);
    } catch { /* comparison is optional */ }
  }

  let note = fallbackNote(score, total, cfg.title);
  if (AI_ENABLED) {
    try {
      const missed = cfg.questions
        .filter((q) => answers[String(q.id)] !== q.answer)
        .map((q) => q.prompt.trim())
        .filter(Boolean)
        .slice(0, 8)
        .map((p, i) => `${i + 1}. ${p.slice(0, 160)}`)
        .join("\n");
      const userMsg = [
        `Benchmark: "${cfg.title}".`,
        `You: ${score} of ${total}.`,
        aiScore != null ? `A small AI model: ${aiScore} of ${total}.` : "",
        missed ? `Questions you missed (prompts):\n${missed}` : "You got everything right.",
      ].filter(Boolean).join("\n");
      const ai = await benchmarkNoteAI(NOTE_SYSTEM, userMsg);
      if (ai) note = ai;
    } catch { /* keep the fallback */ }
  }

  return Response.json({ score, total, aiScore, note });
}
