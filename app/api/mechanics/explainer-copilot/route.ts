import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, moduleCopilotAI, sourceMaterialBlock } from "@/lib/ai";
import { streamSpecResponse } from "@/lib/mechanics/specStream";
import { validateExplainerSpec } from "@/lib/mechanics/explainerStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // a full spec streams for ~2 minutes; 120 cut it off

const SCHEMA = `An explainer (a taught, guided walkthrough) as JSON:
{ "slug": "kebab-case", "name": "the explainer name", "emoji": "📖",
  "subject": "what it teaches", "intro": "1-2 sentences that name what this teaches and drop the learner straight in (NOT a pitch for why the topic matters)",
  "sections": [ { "title": "the concept this section teaches", "body": "SEVERAL substantial paragraphs (roughly 150-300 words) that actually TEACH this one concept in depth: define it precisely, explain how it works / the mechanism, walk one concrete worked example, and clear up the common misunderstanding. Enough that a learner genuinely understands it.", "key": ["a key point", "another"], "check": "one question that tests understanding of THIS concept (optional)" } ],
  "takeaway": "the one thing to remember" }`;

const SYSTEM = `You turn source material into a substantive EXPLAINER: a taught walkthrough that actually TEACHES the concepts in the material, one at a time, in depth. This is real teaching, not a summary, a table of contents, or a pitch.
${SCHEMA}
RULES:
- TEACH THE CONCEPTS THEMSELVES. Explain what each idea IS and how it works, from first principles, the way a good professor would at a whiteboard. NEVER spend sentences on why the topic is important, why it's worth learning, or what the section will cover — no meta-commentary, no throat-clearing. Go straight into the substance.
- GIVE EACH CONCEPT REAL ROOM. A section is a full mini-lesson (several paragraphs), not a bullet or a sentence. If a topic would take a teacher 3-4 minutes to explain well, write that much. DEVELOP one idea fully — definition, mechanism, a concrete worked example, the usual misconception — before moving to the next. Do NOT skim, and do NOT jump quickly from point to point.
- COVER THE MATERIAL'S ACTUAL CONCEPTS thoroughly. Use as many sections as the concepts require (up to ~10), one concept per section, in a logical teaching order that builds.
- Ground faithfully in the source: use its real definitions, terms, and examples, and don't invent facts. But teaching means EXPLAINING those ideas fully in your own clear words — elaboration and worked examples are expected, not "inventing".
- Plain, concrete, second person where natural. 1-3 "key" points per section; an optional "check". Finish with a "takeaway".
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
  const user_msg = [current ? `IMPROVE this explainer per the instruction. Return full JSON.\n\nCURRENT:\n${current}` : "Draft a new explainer.", intent ? `\nAUTHOR'S INSTRUCTION:\n${intent}` : "", sourceMaterialBlock(source, body.opinion === "high" ? "high" : "low")].join("\n");
  try {
    if (body?.stream) return streamSpecResponse(SYSTEM, user_msg, validateExplainerSpec);
    const spec = await moduleCopilotAI(SYSTEM, user_msg);
    if (!spec) return Response.json({ error: "The copilot couldn't produce an explainer. Try rephrasing." }, { status: 502 });
    return Response.json({ spec, errors: validateExplainerSpec(spec) });
  } catch (e: any) { return Response.json({ error: e?.message || "AI request failed." }, { status: 500 }); }
}
