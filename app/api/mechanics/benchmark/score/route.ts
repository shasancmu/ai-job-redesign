import { createClient } from "@/lib/supabase/server";
import { scoreConfig, fallbackNote, computeCalibration } from "@/lib/benchmark";
import { getBenchConfig } from "@/lib/mechanics/benchStore";
import { AI_ENABLED, benchmarkNoteAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const NOTE_SYSTEM = `You give a ONE-sentence debrief on a timed quiz the learner just finished. You know their score, and (when given) their calibration: how their stated confidence compared to how often they were actually right. Be specific to the topic and to how they did. If they were overconfident, name it plainly and kindly (feeling sure is not the same as being right). If they were well calibrated, credit it. If they simply missed a lot, point at what to review. Warm and direct, like a good coach. Under 28 words. Plain language, no jargon, no em dashes. Return only the sentence.`;

// Score a quiz server-side (the key never reaches the client), score how well the
// learner's confidence tracked reality (calibration), store the attempt so growth
// shows over time, and return a debrief specific to this module and their answers.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "");
  const cfg = await getBenchConfig(slug);
  if (!cfg) return Response.json({ error: "unknown quiz" }, { status: 400 });
  const answers = (body.answers && typeof body.answers === "object") ? body.answers : {};
  const confidence = (body.confidence && typeof body.confidence === "object") ? body.confidence : {};
  const score = scoreConfig(cfg, answers);
  const total = cfg.questions.length;
  const calibration = cfg.askConfidence !== false ? computeCalibration(cfg, answers, confidence) : null;

  // The learner's previous run of this quiz (for the growth comparison), read
  // before we store this one.
  let prior: any = null;
  try {
    const { data } = await supabase
      .from("quiz_attempts")
      .select("score, total, brier, created_at")
      .eq("user_id", user.id).eq("slug", slug)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data) prior = data;
  } catch { /* table not set up yet; skip the comparison */ }

  // Store this attempt so score and calibration accumulate over time.
  try {
    await supabase.from("quiz_attempts").insert({
      user_id: user.id, slug, score, total,
      brier: calibration ? calibration.brier : null,
      calibration: calibration ?? null,
    });
  } catch { /* best effort */ }

  let note = fallbackNote(score, total, cfg.title);
  if (AI_ENABLED) {
    try {
      const missed = cfg.questions
        .filter((q) => answers[String(q.id)] !== q.answer)
        .map((q) => q.prompt.trim()).filter(Boolean).slice(0, 8)
        .map((p, i) => `${i + 1}. ${p.slice(0, 160)}`).join("\n");
      const userMsg = [
        `Quiz: "${cfg.title}".`,
        `Result: ${score} of ${total} correct.`,
        calibration ? `Calibration: they were ${calibration.verdict}. On average they felt ${Math.round(calibration.meanConfidence * 100)}% sure but were right ${Math.round(calibration.accuracy * 100)}% of the time.` : "",
        missed ? `Questions they got wrong (prompts):\n${missed}` : "They got everything right.",
      ].filter(Boolean).join("\n");
      const ai = await benchmarkNoteAI(NOTE_SYSTEM, userMsg);
      if (ai) note = ai;
    } catch { /* keep the fallback */ }
  }

  return Response.json({ score, total, note, calibration, prior });
}
