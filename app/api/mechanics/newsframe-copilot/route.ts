import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, moduleCopilotAI } from "@/lib/ai";
import { validateNewsSpec } from "@/lib/mechanics/newsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const SCHEMA = `An "In the News" module (apply a framework to current real news) as JSON:
{
  "slug": "kebab-case", "name": "the module name", "emoji": "🗞️",
  "topic": "a news search query for the stories to pull, e.g. 'artificial intelligence business strategy' or 'retail earnings' or 'tech mergers acquisitions'",
  "framework": "the framework name, e.g. Porter's Five Forces",
  "frameworkLogic": "how to apply the framework rigorously (its concepts and what a good application looks like)",
  "fields": [ { "key": "shortkey", "label": "the dimension the learner analyzes", "hint": "what to look for in the story" } ],
  "verdict": { "label": "the calibrated call to make", "options": [ { "value": "v", "label": "what the learner sees" } ] },
  "grading": "one line on what a strong vs weak application looks like"
}`;

const SYSTEM = `You author "In the News" modules: the learner reads a CURRENT, real news story and applies a business framework to it. Fresh stories are pulled live, so the module never goes stale.
${SCHEMA}
RULES:
- Choose a real framework (Porter's Five Forces, Jobs-to-be-Done, disruption theory, SWOT, the resource-based view, an AI-opportunity lens, etc.) and give its actual logic in frameworkLogic.
- Set "topic" to a news query that will return a steady stream of relevant business stories.
- The "fields" ARE the framework's dimensions (e.g. Five Forces -> the five forces). 3 to 6 fields.
- The "verdict" is the calibrated call the framework leads to (e.g. "Is this industry structurally attractive?"). Optional but recommended.
Output ONLY the JSON object.`;

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
  if (!intent && !current) return Response.json({ error: "Describe the module you want." }, { status: 400 });
  setFlow("mechanics:newsframe-copilot");
  const user_msg = [current ? `IMPROVE this module per the instruction. Return full JSON.\n\nCURRENT:\n${current}` : "Draft a new module.", intent ? `\nAUTHOR'S INSTRUCTION:\n${intent}` : "", source ? `\nSOURCE MATERIAL (the framework, perhaps):\n${source}` : ""].join("\n");
  try {
    const spec = await moduleCopilotAI(SYSTEM, user_msg);
    if (!spec) return Response.json({ error: "The copilot couldn't produce a module. Try rephrasing." }, { status: 502 });
    return Response.json({ spec, errors: validateNewsSpec(spec) });
  } catch (e: any) { return Response.json({ error: e?.message || "AI request failed." }, { status: 500 }); }
}
