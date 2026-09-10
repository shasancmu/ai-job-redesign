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
  if (attempt.length < 12) return Response.json({ error: "Write your explanation first." }, { status: 400 });

  // Prefer the saved genome (authoritative). If it isn't saved yet — an author
  // previewing a freshly-generated draft — fall back to the core sent inline.
  const saved = slug ? await loadPaperx(slug, user.id) : null;
  const core = saved
    ? { title: saved.title, puzzle: `We believe ${saved.puzzle.believe}. We'd expect ${saved.puzzle.expect}. But we observe ${saved.puzzle.observe}.`, idea: `IF ${saved.idea.if_}, THEN ${saved.idea.then_}, ${saved.idea.whenZ}, BECAUSE ${saved.idea.because}.`, mechanism: saved.mechanism.body, audience: saved.teachBack.audience, rubric: saved.teachBack.rubric }
    : (body.core && typeof body.core === "object"
        ? { title: String(body.core.title || "the paper"), puzzle: String(body.core.puzzle || ""), idea: String(body.core.idea || ""), mechanism: String(body.core.mechanism || ""), audience: String(body.core.audience || "a smart friend outside your field"), rubric: (Array.isArray(body.core.rubric) ? body.core.rubric : []).map((r: any) => String(r)).slice(0, 6) }
        : null);
  if (!core) return Response.json({ error: "Explainer not found." }, { status: 404 });

  setFlow("paperx-teachback");
  try {
    const out = await paperxTeachbackAI({
      title: core.title, puzzle: core.puzzle, idea: core.idea, mechanism: core.mechanism,
      audience: core.audience, rubric: core.rubric, attempt,
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
