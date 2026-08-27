import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, moduleCopilotAI } from "@/lib/ai";
import { validateNegScenario } from "@/lib/mechanics/negStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const SCHEMA = `A negotiation Scenario (JSON). Multi-issue is preferred: it teaches value creation through trades.
Multi-issue:
{
  "kind": "multi-issue", "slug": "kebab-case", "name": "the module name",
  "counterpartName": "the AI counterpart's name", "youRole": "the learner's role", "themRole": "the counterpart's role",
  "scenario": "the situation the learner sees (their goal, their walk-away, that the other side has hidden priorities)",
  "yourBatna": 900,
  "issues": [
    { "key": "salary", "label": "Base salary", "options": [ { "label": "$120k", "you": 0, "them": 800 }, { "label": "$160k", "you": 800, "them": 0 } ] }
  ]
}
Single-price (distributive):
{ "kind": "single-price", "slug", "name", "counterpartName", "youRole", "themRole", "scenario", "role": "buyer", "yourReservation": 16000, "theirReservation": 12500, "listPrice": 17500, "unit": "$", "item": "the van" }`;

const SYSTEM = `You author negotiation simulations for a learning platform. The learner negotiates against an AI counterpart driven by a HIDDEN payoff table; the round is scored on value created (efficient trades) and value claimed.

${SCHEMA}

RULES:
- Prefer multi-issue with 4 to 6 issues. Across the issues, deliberately vary the structure: some COMPATIBLE (both sides want the same option), some DISTRIBUTIVE (pure win-lose), and some INTEGRATIVE (the sides weight two issues oppositely, so trading across them creates value). This is what makes it teachable.
- "you" = the learner's points per option; "them" = the counterpart's points. Higher = better for that side. Scale points so the best possible package is a few thousand points.
- Set yourBatna so a lazy, split-the-difference deal barely beats it and a good traded deal clearly beats it.
- Keep it fictional and professional. Single-price should default to role "buyer".
- Output ONLY the JSON object.`;

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
  if (!intent && !current) return Response.json({ error: "Describe the negotiation you want." }, { status: 400 });
  setFlow("mechanics:negotiation-copilot");

  const user_msg = [
    current ? `IMPROVE this scenario per the instruction. Return the full updated JSON.\n\nCURRENT:\n${current}` : "Draft a new negotiation scenario.",
    intent ? `\nAUTHOR'S INSTRUCTION:\n${intent}` : "",
    source ? `\nSOURCE MATERIAL:\n${source}` : "",
  ].join("\n");

  try {
    const spec = await moduleCopilotAI(SYSTEM, user_msg);
    if (!spec) return Response.json({ error: "The copilot couldn't produce a scenario. Try rephrasing." }, { status: 502 });
    const errors = validateNegScenario(spec);
    return Response.json({ spec, errors });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
