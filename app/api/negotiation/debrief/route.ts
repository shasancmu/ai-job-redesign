import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, coachReply } from "@/lib/ai";
import { analyze, debriefFacts, scenarioByExercise } from "@/lib/negotiation";
import { getUserLanguage, withLanguage } from "@/lib/lang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are a world-class negotiation professor debriefing an MBA student right after a negotiation against an AI counterpart. Use ONLY the FACTS given. Be specific, candid, and encouraging — warm but honest.
Cover, in short paragraphs:
1. Value CREATED — did they reach an efficient deal, or leave value on the table? For a multi-issue negotiation, name the specific misses: fighting over a "compatible" issue (both sides secretly wanted the same option), or failing to trade an issue they cared little about for one they cared a lot about (logrolling). For a single-issue price haggle, "creation" is limited — the lesson is claiming.
2. Value CLAIMED — how much of the pie did they capture, and did their outcome beat their walk-away (BATNA)? Note anchoring / first-offer dynamics if visible in the transcript (who anchored, how far, who moved).
3. Two concrete things to try next time.
6–9 sentences total, no headers.`;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const terms = body.terms || {};
  const noDeal = !!body.noDeal;
  const transcript = String(body.transcript || "").slice(0, 4000);
  const scn = scenarioByExercise(String(body.exercise || "negotiation"));
  if (!scn) return Response.json({ error: "unknown scenario" }, { status: 400 });

  try {
    const facts = debriefFacts(scn, analyze(scn, terms, noDeal));
    const user_msg = `FACTS:\n${JSON.stringify(facts, null, 2)}\n\nTranscript excerpt:\n${transcript || "(none)"}`;
    const feedback = await withLanguage(await getUserLanguage(supabase, user.id), () => coachReply(SYSTEM, user_msg));
    return Response.json({ feedback });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't build the debrief." }, { status: 502 });
  }
}
