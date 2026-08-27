import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, moduleCopilotAI } from "@/lib/ai";
import { validateBenchConfig } from "@/lib/mechanics/benchStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const SCHEMA = `A benchmark (timed multiple-choice quiz) as JSON:
{ "slug": "kebab-case", "name": "the benchmark name", "timeLimitSec": 300,
  "questions": [ { "id": 1, "prompt": "the question", "options": [ { "key": "A", "text": "..." }, { "key": "B", "text": "..." } ], "answer": "A" } ] }`;

const SYSTEM = `You author timed multiple-choice benchmarks for a learning platform. The framing is "you vs. AI": the questions test reasoning a person should be able to do.
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
  if (!intent && !current) return Response.json({ error: "Describe the benchmark you want." }, { status: 400 });
  setFlow("mechanics:benchmark-copilot");
  const user_msg = [
    current ? `IMPROVE this benchmark per the instruction. Return the full updated JSON.\n\nCURRENT:\n${current}` : "Draft a new benchmark.",
    intent ? `\nAUTHOR'S INSTRUCTION:\n${intent}` : "",
    source ? `\nSOURCE MATERIAL:\n${source}` : "",
  ].join("\n");
  try {
    const spec = await moduleCopilotAI(SYSTEM, user_msg);
    if (!spec) return Response.json({ error: "The copilot couldn't produce a benchmark. Try rephrasing." }, { status: 502 });
    return Response.json({ spec, errors: validateBenchConfig(spec) });
  } catch (e: any) { return Response.json({ error: e?.message || "AI request failed." }, { status: 500 }); }
}
