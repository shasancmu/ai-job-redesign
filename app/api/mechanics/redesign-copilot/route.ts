import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, moduleCopilotAI, sourceMaterialBlock } from "@/lib/ai";
import { streamSpecResponse } from "@/lib/mechanics/specStream";
import { validateRedesignSpec } from "@/lib/mechanics/redesignStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SCHEMA = `A paired-redesign spec (JSON). Two learners interview each other about a subject, then each redesigns the OTHER's subject on an instrument of buckets, then reveal + feedback.
{
  "slug": "kebab-case", "name": "the module name", "emoji": "🤝",
  "subject": "what gets redesigned, e.g. 'job', 'workflow', 'research plan'",
  "setupPrompt": "instruction for what each learner writes about their OWN subject",
  "interviewPrompt": "what the interviewer should draw out about their partner",
  "splitTitle": "the heading of the redesign instrument",
  "splitIntro": "the framework/logic the learner applies when redesigning",
  "buckets": [ { "key": "shortkey", "label": "the category", "role": "ai" | "human", "hint": "one line" } ]
}`;

const SYSTEM = `You author paired-redesign experiences: two people interview each other, then redesign each other's subject on a shared instrument.
${SCHEMA}
RULES:
- Give 4 to 8 buckets split across role "ai" (delegate to AI) and role "human" (lean in), grounded in a real framework if named.
- Keep it concrete and fictional-safe. Output ONLY the JSON object.`;

export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const intent = String(body.intent || "").slice(0, 4000);
  const source = String(body.sourceText || "").slice(0, 12000);
  const current = body.currentSpec ? JSON.stringify(body.currentSpec).slice(0, 12000) : "";
  if (!intent && !current) return Response.json({ error: "Describe the redesign you want." }, { status: 400 });
  setFlow("mechanics:redesign-copilot");
  const user_msg = [current ? `IMPROVE this per the instruction. Return full JSON.\n\nCURRENT:\n${current}` : "Draft a new redesign.", intent ? `\nAUTHOR'S INSTRUCTION:\n${intent}` : "", sourceMaterialBlock(source)].join("\n");
  try {
    if (body?.stream) return streamSpecResponse(SYSTEM, user_msg, validateRedesignSpec);
    const spec = await moduleCopilotAI(SYSTEM, user_msg);
    if (!spec) return Response.json({ error: "The copilot couldn't produce a spec. Try rephrasing." }, { status: 502 });
    return Response.json({ spec, errors: validateRedesignSpec(spec) });
  } catch (e: any) { return Response.json({ error: e?.message || "AI request failed." }, { status: 500 }); }
}
