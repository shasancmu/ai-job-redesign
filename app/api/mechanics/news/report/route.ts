import { createClient } from "@/lib/supabase/server";
import { recordModuleEvent } from "@/lib/moduleEvents";
import { setFlow } from "@/lib/aiflow";
import { recordMechanicsResult } from "@/lib/cohortData";
import { AI_ENABLED, roleplayExaminerAI } from "@/lib/ai";
import { getNewsSpec } from "@/lib/mechanics/newsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Grade how well the learner applied the framework to the REAL story they chose.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const spec = await getNewsSpec(String(body.slug || ""));
  if (!spec) return Response.json({ error: "unknown module" }, { status: 400 });
  const story = body.story || {};
  const analysis = (body.analysis && typeof body.analysis === "object") ? body.analysis : {};
  const verdict = body.verdict || {};
  setFlow(`news:${spec.slug}:report`);

  const fieldList = (spec.fields || []).map((f) => `- ${f.key} (${f.label}): ${f.hint}`).join("\n");
  const learnerWork = (spec.fields || []).map((f) => `## ${f.label}\n${analysis[f.key] || "(left blank)"}`).join("\n\n");
  const system = `You are grading a learner who applied the ${spec.framework} framework to a REAL, current news story. ${spec.frameworkLogic}
${spec.grading}
Grade the QUALITY of the framework application: did they use the framework's concepts correctly, ground each point in the actual story (not generic boilerplate), and reach a defensible read? Reward specificity to THIS story; penalize generic answers that could apply to anything.
The analysis fields:
${fieldList}
Output ONLY JSON: {"score":0-100,"framework_use":[{"field":"the field label","quality":"high|med|low","note":"one specific line"}],"analyst_read":"2-3 sentences on how a sharp analyst would apply ${spec.framework} to THIS story","best_miss":"the most important thing they under-used or missed","verdict_note":"a line on their overall call, if they made one","principle":"the transferable lesson about using ${spec.framework} on real situations"}. No em dashes.`;
  const userMsg = `THE STORY:\nHeadline: ${story.title || ""}\nSource: ${story.source || ""}${story.snippet ? `\n${story.snippet}` : ""}\n\nTHE LEARNER'S ANALYSIS:\n${learnerWork}\n\nTHEIR CALL: ${verdict.call || "(none)"}${verdict.confidence != null ? ` at ${verdict.confidence}% confidence` : ""}`;
  try {
    const report = await roleplayExaminerAI(system, userMsg, 2200);
    if (!report) return Response.json({ error: "Couldn't grade. Try again." }, { status: 502 });
    await recordMechanicsResult("newsframe", String(body.slug || ""), user?.id, typeof report?.score === "number" ? report.score : null, `${spec.framework}: ${report?.verdict_note || ""}${report?.best_miss ? ` | missed: ${report.best_miss}` : ""}`);
    await recordModuleEvent(String(body.slug || ""), "newsframe", "complete", user?.id);
    return Response.json({ report });
  } catch (e: any) { return Response.json({ error: e?.message || "Grading failed." }, { status: 500 }); }
}
