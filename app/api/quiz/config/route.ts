import { configReady } from "@/lib/benchmark";
import { quizConfigForCode } from "@/lib/quizConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC: the question set WITHOUT answers, for anonymous takers. Uses the
// per-quiz config when a code is given, else the shared benchmark config.
// Answers never leave the server.
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") || "";
  const cfg = await quizConfigForCode(code);
  return Response.json({
    title: cfg.title,
    timeLimitSec: cfg.timeLimitSec,
    total: cfg.questions.length,
    ready: configReady(cfg),
    questions: cfg.questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })), // no answer
  });
}
