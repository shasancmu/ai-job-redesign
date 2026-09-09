import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, paperxTeachbackAI } from "@/lib/ai";
import { loadPaperx } from "@/lib/paperx/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Evaluate a learner's teach-back attempt against the explainer's core idea.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "").trim();
  const attempt = String(body.attempt || "").trim();
  if (!slug || attempt.length < 12) return Response.json({ error: "Write your explanation first." }, { status: 400 });

  const g = await loadPaperx(slug, user.id);
  if (!g) return Response.json({ error: "Explainer not found." }, { status: 404 });

  setFlow("paperx-teachback");
  try {
    const puzzle = `We believe ${g.puzzle.believe}. We'd expect ${g.puzzle.expect}. But we observe ${g.puzzle.observe}.`;
    const idea = `IF ${g.idea.if_}, THEN ${g.idea.then_}, ${g.idea.whenZ}, BECAUSE ${g.idea.because}.`;
    const out = await paperxTeachbackAI({
      title: g.title, puzzle, idea, mechanism: g.mechanism.body,
      audience: g.teachBack.audience, rubric: g.teachBack.rubric, attempt,
    });
    const score = Math.max(0, Math.min(100, Math.round(Number(out?.score) || 0)));
    return Response.json({
      score,
      verdict: String(out?.verdict || ""),
      strengths: (Array.isArray(out?.strengths) ? out.strengths : []).map((s: any) => String(s)).slice(0, 3),
      gaps: (Array.isArray(out?.gaps) ? out.gaps : []).map((s: any) => String(s)).slice(0, 3),
      model: String(out?.model || ""),
    });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't evaluate that." }, { status: 500 });
  }
}
