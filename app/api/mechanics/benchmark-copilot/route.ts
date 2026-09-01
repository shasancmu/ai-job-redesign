import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, moduleCopilotAI, sourceMaterialBlock } from "@/lib/ai";
import { streamSpecResponse } from "@/lib/mechanics/specStream";
import { validateBenchConfig } from "@/lib/mechanics/benchStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SCHEMA = `A timed multiple-choice quiz as JSON:
{ "slug": "kebab-case", "name": "the quiz name", "timeLimitSec": 300,
  "questions": [ { "id": 1, "prompt": "the question", "options": [ { "key": "A", "text": "..." }, { "key": "B", "text": "..." } ], "answer": "A" } ] }`;

const SYSTEM = `You author timed multiple-choice quizzes for a learning platform. The questions test understanding of the topic.
${SCHEMA}
RULES:
- Write 5 to 12 clear questions, each with 4 or 5 options keyed A, B, C, ... and exactly one correct "answer" (the key).
- Make the distractors plausible; avoid trick wording. Keep it fair and unambiguous.
- Pick a sensible timeLimitSec (about 45-60 seconds per question).
- Keep everything fictional/original; no copyrighted test items.
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
  if (!intent && !current) return Response.json({ error: "Describe the quiz you want." }, { status: 400 });
  setFlow("mechanics:benchmark-copilot");
  const user_msg = [
    current ? `IMPROVE this quiz per the instruction. Return the full updated JSON.\n\nCURRENT:\n${current}` : "Draft a new quiz.",
    intent ? `\nAUTHOR'S INSTRUCTION:\n${intent}` : "",
    sourceMaterialBlock(source, body.opinion === "high" ? "high" : "low"),
  ].join("\n");
  try {
    if (body?.stream) return streamSpecResponse(SYSTEM, user_msg, validateBenchConfig);
    const spec = await moduleCopilotAI(SYSTEM, user_msg);
    if (!spec) return Response.json({ error: "The copilot couldn't produce a quiz. Try rephrasing." }, { status: 502 });
    return Response.json({ spec, errors: validateBenchConfig(spec) });
  } catch (e: any) { return Response.json({ error: e?.message || "AI request failed." }, { status: 500 }); }
}
