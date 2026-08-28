import { createClient } from "@/lib/supabase/server";
import { recordModuleEvent } from "@/lib/moduleEvents";
import { createAdminClient } from "@/lib/supabase/admin";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, roleplayExaminerAI } from "@/lib/ai";
import { selectScenario, examinerPrompt } from "@/lib/mechanics/roleplay";
import { getSpec } from "@/lib/mechanics/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Generic grader: build the examiner prompt from the spec's rubric + the hidden
// answer key for the active scenario, then return the rubric-shaped JSON.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "");
  const code = String(body.code || "");
  if (!slug || !code) return Response.json({ error: "missing slug or code" }, { status: 400 });

  const spec = await getSpec(slug);
  if (!spec || !spec.rubric) return Response.json({ error: "module has no rubric" }, { status: 400 });
  const scn = selectScenario(spec, code);
  setFlow(`roleplay:${slug}:report`);

  const { system, user: userMsg } = examinerPrompt(spec, scn, String(body.transcript || ""), body.verdict || {});
  try {
    const report = await roleplayExaminerAI(system, userMsg);
    if (!report) return Response.json({ error: "Couldn't grade. Try again." }, { status: 502 });
    // Persist the run so the module's author can observe how learners do. Best
    // effort: a missing table or write error must never block the learner.
    try {
      await createAdminClient().from("roleplay_results").insert({
        slug,
        user_id: user.id,
        scenario: scn.id,
        cohort: body.cohort ? String(body.cohort).slice(0, 64) : null,
        verdict: body.verdict || {},
        report,
        score: typeof report.score === "number" ? Math.round(report.score) : null,
      });
    } catch { /* table not migrated yet, or transient — ignore */ }
    await recordModuleEvent(slug, "roleplay", "complete", user.id);
    return Response.json({ report });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
