import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { recordMechanicsResult } from "@/lib/cohortData";
import { AI_ENABLED, roleplayExaminerAI } from "@/lib/ai";
import { analyze } from "@/lib/negotiation";
import { getNegScenario } from "@/lib/mechanics/negStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Score a finished negotiation with the real analyze() (which also reveals the
// counterpart's optimal per issue), then add an AI coach debrief.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const scn = await getNegScenario(String(body.slug || ""));
  if (!scn) return Response.json({ error: "unknown scenario" }, { status: 400 });
  const terms = (body.terms && typeof body.terms === "object") ? body.terms : {};
  const noDeal = !!body.noDeal;
  const a = analyze(scn, terms, noDeal);
  setFlow("mechanics:negotiation:report");

  let debrief: any = null;
  if (AI_ENABLED) {
    const facts = a.noDeal
      ? "The learner walked away with no deal."
      : a.kind === "multi-issue"
        ? `Your score: ${a.you} (walk-away/BATNA was ${(scn as any).yourBatna}, beaten: ${a.beatBATNA}). Joint value ${a.joint}/${a.maxJoint} = ${a.efficiency}% efficient. Per issue: ${(a.issues || []).map((i) => `${i.label}: chose ${i.chosen} (you ${i.you}/them ${i.them}, best-joint was ${i.optimal}${i.atOptimal ? ", HIT" : ", MISSED"}, ${i.tag})`).join("; ")}.`
        : `Agreed price ${a.agreedPrice}. Your surplus ${a.you}, theirs ${a.them}, ${a.efficiency}% of the zone of agreement claimed.`;
    const system = "You are a negotiation coach debriefing one practice round. Grade the PROCESS (value creation via trades, claiming, BATNA discipline), not luck. Be specific and kind. Output ONLY JSON: {\"headline\":\"one line\",\"whatWorked\":\"...\",\"biggestMiss\":\"the trade or move left on the table\",\"principle\":\"the transferable lesson\"}. No em dashes.";
    const userMsg = `Scenario: ${scn.name}. ${scn.scenario}\n\nResult:\n${facts}`;
    try { debrief = await roleplayExaminerAI(system, userMsg, 1200); } catch { debrief = null; }
  }

  await recordMechanicsResult("negotiation", String(body.slug || ""), user?.id, typeof a?.efficiency === "number" ? a.efficiency : null, `joint ${a?.joint}/${a?.maxJoint} (${a?.efficiency}% efficient), beat BATNA: ${a?.beatBATNA}`);
  return Response.json({ analysis: a, debrief });
}
