import { createClient } from "@/lib/supabase/server";
import { scoreConfig, fallbackNote } from "@/lib/benchmark";
import { getBenchConfig } from "@/lib/mechanics/benchStore";
import { AI_ENABLED, benchmarkNoteAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const NOTE_SYSTEM = `You give a ONE-sentence debrief on a timed multiple-choice quiz the learner just finished. Be specific to this quiz's topic and to how they actually did. If they did well, say so plainly. If they missed a lot, name the kind of thing they slipped on (drawn from the missed questions) and encourage another pass. Warm and direct, like a good coach. Under 28 words. Plain language, no jargon, no em dashes. Return only the sentence.`;

// Score a quiz server-side (the key never reaches the client) and return a short
// debrief specific to this module and the learner's own answers.
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
        `Quiz: "${cfg.title}".`,
        `Result: ${score} of ${total} correct.`,
        missed ? `Questions they got wrong (prompts):\n${missed}` : "They got everything right.",
      ].join("\n");
      const ai = await benchmarkNoteAI(NOTE_SYSTEM, userMsg);
      if (ai) note = ai;
    } catch { /* keep the fallback */ }
  }

  return Response.json({ score, total, note });
}
