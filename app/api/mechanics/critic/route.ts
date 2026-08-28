import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, moduleCriticAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// The pre-publish critic: an adversarial read of the module's design that
// playtests it on paper and returns concrete, ranked weaknesses to fix.
const SYSTEM = `You are a rigorous instructional designer reviewing a role-play / hidden-truth learning module before it ships. You have the FULL spec, including the hidden scenarios and answer keys. Find the design flaws that would make the module unfair, un-teachable, or gameable. Check specifically:
- Discriminability: across the scenarios, do the probes actually SEPARATE them? Flag any probe whose answer is the same in every scenario (it teaches nothing), and any scenario that answers every probe identically to another (a learner can't tell them apart).
- Tell leakage: does the public world text, the character's opener, a persona, or any answer give away the hidden truth too early or too bluntly?
- The ambiguous case: if a scenario is meant to be genuinely "can't tell", verify it has NO single decisive tell. If it secretly resolves, say so.
- Behavior contract: is it internally consistent and honest (never forces the character to lie)? Does any scenario's answer violate it?
- Rubric alignment: does the rubric grade the QUALITY of questioning and calibration, not merely whether they guessed the label? Does it match the stated objective?
- Guardrails: do neverReveal/immutable actually protect the hidden scenario and answer keys?
- Fairness & length: is the question budget enough to find the tell? Is the brief clear?

Return ONLY JSON:
{ "readiness": "ready" | "needs-work" | "not-ready",
  "summary": "one or two sentences",
  "findings": [ { "severity": "high" | "medium" | "low", "area": "short label", "title": "the problem in a phrase", "detail": "why it's a problem, citing the specific scenario/probe", "fix": "the concrete change to make" } ] }
Rank findings most-severe first. If the module is genuinely solid, return few or no findings and say so. Be specific and cite scenario ids and probe keys. No em dashes.`;

export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  if (!body.spec) return Response.json({ error: "No spec." }, { status: 400 });
  setFlow("mechanics:critic");

  try {
    const result = await moduleCriticAI(SYSTEM, JSON.stringify(body.spec).slice(0, 30000));
    if (!result) return Response.json({ error: "The critic couldn't finish. Try again." }, { status: 502 });
    return Response.json({ result });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Critique failed." }, { status: 500 });
  }
}
