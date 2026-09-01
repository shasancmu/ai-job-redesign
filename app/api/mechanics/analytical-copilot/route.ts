import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, moduleCopilotAI, sourceMaterialBlock } from "@/lib/ai";
import { streamSpecResponse } from "@/lib/mechanics/specStream";
import { validateAnalyticalSpec } from "@/lib/mechanics/analyticalStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SCHEMA = `An analytical instrument (X-ray style) as JSON. It decomposes a subject into units and scores each against ordered levels.
{
  "slug": "kebab-case", "name": "the instrument name", "emoji": "📊",
  "subject": "what gets analyzed, e.g. 'a job', 'a strategy memo', 'a research plan'",
  "setupLabel": "the prompt for what the learner pastes or names",
  "setupPlaceholder": "an example input",
  "unitLabel": "the unit, e.g. 'task', 'claim', 'assumption', 'risk'",
  "decompose": "how to break the subject into units",
  "lens": "the framework/rubric to apply when scoring",
  "levels": [ { "key": "L0", "label": "None", "desc": "what this level means", "value": 0 }, { "key": "L2", "label": "High", "desc": "...", "value": 100 } ],
  "aggregateLabel": "what the average means, e.g. 'Overall AI exposure'"
}`;

const SYSTEM = `You author analytical instruments for a learning platform. Each takes a subject, breaks it into units, and scores every unit against an ordered scale, then reports an aggregate.
${SCHEMA}
RULES:
- Define 3 to 5 ordered levels with clear, distinguishable descriptions and values from 0 to 100 spread across the range.
- Ground the "lens" in a real framework if the author names one (e.g. task-level AI exposure, risk severity, evidence strength).
- Keep everything as data; nothing unsafe.
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
  if (!intent && !current) return Response.json({ error: "Describe the instrument you want." }, { status: 400 });
  setFlow("mechanics:analytical-copilot");
  const user_msg = [current ? `IMPROVE this instrument per the instruction. Return the full JSON.\n\nCURRENT:\n${current}` : "Draft a new instrument.", intent ? `\nAUTHOR'S INSTRUCTION:\n${intent}` : "", sourceMaterialBlock(source, body.opinion === "high" ? "high" : "low")].join("\n");
  try {
    if (body?.stream) return streamSpecResponse(SYSTEM, user_msg, validateAnalyticalSpec);
    const spec = await moduleCopilotAI(SYSTEM, user_msg);
    if (!spec) return Response.json({ error: "The copilot couldn't produce an instrument. Try rephrasing." }, { status: 502 });
    return Response.json({ spec, errors: validateAnalyticalSpec(spec) });
  } catch (e: any) { return Response.json({ error: e?.message || "AI request failed." }, { status: 500 }); }
}
