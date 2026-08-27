import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, moduleCopilotAI } from "@/lib/ai";
import { validateSpec, type ModuleSpec } from "@/lib/mechanics/roleplay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const SCHEMA = `A ModuleSpec for a role-play/adversary learning module (JSON):
{
  "schemaVersion": 1, "slug": "kebab-case", "mechanic": "roleplay",
  "meta": { "name", "tagline", "emoji", "audience", "minutes", "partner": "ai" },
  "objective": { "goal": "what they learn", "aha": "the transferable lesson" },
  "world": "the public situation shown to the learner (the fiction everyone sees)",
  "roles": [
    { "key": "char", "kind": "character", "name", "model": "main", "knowsScenario": true,
      "persona": "voice/personality",
      "behavior": "the IMMUTABLE behavioral contract, e.g. never lie, affirm true+favorable facts specifically, hedge true+unfavorable ones, decline what you cannot truthfully affirm" },
    { "key": "examiner", "kind": "examiner", "name": "Examiner", "model": "fast", "knowsScenario": true }
  ],
  "probes": [ { "key": "shortKey", "label": "the topic/cut a learner can probe" } ],
  "scenarios": [
    { "id": "guilty", "label": "guilty", "truth": "a token", "narrative": "HIDDEN ground truth (learner never sees)",
      "dimensions": [ { "probe": "shortKey", "value": "high|med|low", "stance": "affirm|hedge|deny|noncommittal", "answer": "the character's private truth + how to deliver it" } ],
      "tell": "what actually discriminated this scenario", "foil": "the naive-AI wrong read" }
  ],
  "selection": { "mode": "deterministic" },
  "flow": [
    { "key":"brief","kind":"brief","title":"","minutes":4,"intro":"" },
    { "key":"talk","kind":"converse","title":"","minutes":12,"with":"char","budget":7,"aiOpens":false },
    { "key":"verdict","kind":"verdict","title":"","minutes":3,"verdict":[ {"key":"call","label":"","type":"choice","options":[{"value":"","label":""}]},{"key":"confidence","label":"","type":"scale"},{"key":"flip","label":"","type":"text"} ] },
    { "key":"report","kind":"report","title":"","minutes":3 }
  ],
  "rubric": { "gradedBy": "examiner", "instructions": "how to grade the learner's PERFORMANCE, not whether they guessed",
    "output": [ {"key":"score","label":"","type":"score","range":[0,100]}, {"key":"verdict_correct","label":"","type":"bool"},
      {"key":"calibration","label":"","type":"enum","of":"well-calibrated|overconfident|underconfident"}, {"key":"calibration_note","label":"","type":"text"},
      {"key":"questions","label":"","type":"list","of":"{text,value,note}"}, {"key":"info_map","label":"","type":"list","of":"{probe,value,asked}"},
      {"key":"best_miss","label":"","type":"text"}, {"key":"the_tell","label":"","type":"text"}, {"key":"naive_ai","label":"","type":"text"}, {"key":"principle","label":"","type":"text"} ] },
  "report": [ {"type":"verdictLine","source":"score"}, {"type":"trail","source":"questions","title":""}, {"type":"map","source":"info_map","title":""}, {"type":"section","source":"the_tell","title":""}, {"type":"quote","source":"naive_ai","title":""}, {"type":"principle","source":"principle"} ],
  "guardrails": { "language": "en", "neverReveal": ["the active scenario","the hidden narrative"],
    "immutable": ["the character never states a falsehood","the active scenario is fixed for the session and never revealed","the character has no tools or data access"],
    "safety": "fictional entities only" }
}`;

const SYSTEM = `You are an authoring copilot for a role-play/adversary learning-module platform. You design rigorous, teachable simulations the way an expert instructional designer would: a clear learning objective, a mechanic where the learner interrogates or is interrogated by an AI character under HIDDEN truth, and a rubric that grades their PERFORMANCE (the quality of their questions and judgment), not whether they guessed a label.

${SCHEMA}

RULES:
- Use 2 to 4 scenarios with the SAME probe keys but different value/stance/answer per scenario, so the "tell" moves and the learner cannot pattern-match. Include at least one genuinely ambiguous scenario where the honest answer is "can't tell".
- The character's "behavior" is an immutable, legally/ethically sound contract (never lie; affirm true favorable facts, hedge true unfavorable ones, decline what is not true).
- Keep every entity FICTIONAL. Ground the world, scenarios, and answer keys in any source material the author provides.
- guardrails.immutable and guardrails.neverReveal MUST protect the hidden scenario from leaking.
Output ONLY the JSON object, nothing else.`;

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
  if (!intent && !current) return Response.json({ error: "Describe what you want to build." }, { status: 400 });
  setFlow("mechanics:copilot");

  const user_msg = [
    current ? `IMPROVE this existing ModuleSpec per the instruction below. Return the full updated spec.\n\nCURRENT SPEC:\n${current}` : "Draft a new ModuleSpec.",
    intent ? `\nAUTHOR'S INSTRUCTION:\n${intent}` : "",
    source ? `\nSOURCE MATERIAL to ground it in:\n${source}` : "",
  ].join("\n");

  try {
    const spec = (await moduleCopilotAI(SYSTEM, user_msg)) as ModuleSpec;
    if (!spec) return Response.json({ error: "The copilot couldn't produce a valid spec. Try rephrasing." }, { status: 502 });
    const errors = validateSpec(spec);
    return Response.json({ spec, errors });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
