import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, moduleCopilotAI, sourceMaterialBlock } from "@/lib/ai";
import { streamSpecResponse } from "@/lib/mechanics/specStream";
import { validateExplainerSpec } from "@/lib/mechanics/explainerStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SCHEMA = `An explainer (a taught, guided walkthrough) as JSON:
{ "slug": "kebab-case", "name": "the explainer name", "emoji": "📖",
  "subject": "what it teaches", "intro": "a short hook: why this matters",
  "sections": [ { "title": "section heading", "body": "2-5 sentences that TEACH it clearly, plain and concrete", "key": ["a key point", "another"], "check": "one quick question to make them think (optional)" } ],
  "takeaway": "the one thing to remember" }`;

const SYSTEM = `You turn source material into a clear, engaging EXPLAINER: a short guided walkthrough that teaches a topic, section by section. This is exposition, not a quiz or a role-play.
${SCHEMA}
RULES:
- 3 to 7 sections, each teaching one idea plainly with a concrete example. Build in a logical order.
- Ground it faithfully in the source; do not invent facts. Keep it tight and readable, second person where natural.
- Add 1-3 "key" points per section and an optional "check" question. Finish with a "takeaway".
Output ONLY the JSON object.`;

export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const intent = String(body.intent || "").slice(0, 4000);
  const source = String(body.sourceText || "").slice(0, 14000);
  const current = body.currentSpec ? JSON.stringify(body.currentSpec).slice(0, 12000) : "";
  if (!intent && !current && !source) return Response.json({ error: "Describe the explainer you want." }, { status: 400 });
  setFlow("mechanics:explainer-copilot");
  const user_msg = [current ? `IMPROVE this explainer per the instruction. Return full JSON.\n\nCURRENT:\n${current}` : "Draft a new explainer.", intent ? `\nAUTHOR'S INSTRUCTION:\n${intent}` : "", sourceMaterialBlock(source)].join("\n");
  try {
    if (body?.stream) return streamSpecResponse(SYSTEM, user_msg, validateExplainerSpec);
    const spec = await moduleCopilotAI(SYSTEM, user_msg);
    if (!spec) return Response.json({ error: "The copilot couldn't produce an explainer. Try rephrasing." }, { status: 502 });
    return Response.json({ spec, errors: validateExplainerSpec(spec) });
  } catch (e: any) { return Response.json({ error: e?.message || "AI request failed." }, { status: 500 }); }
}
