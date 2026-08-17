import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, coachReply } from "@/lib/ai";
import { analyze, debriefFacts } from "@/lib/negotiation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are a world-class negotiation professor debriefing an MBA student (they played the Candidate) right after a six-issue job-offer negotiation against an AI hiring manager. Use ONLY the FACTS given (their score, the counterpart's score, joint value vs. the maximum possible, whether they took the two "compatible" wins, whether they found the key value-creating trade, and their walk-away). Be specific, candid, and encouraging.
Cover, in short paragraphs:
1. Value CREATED — did they reach an efficient deal, or leave joint value on the table? Name the specific misses: fighting over a compatible issue (both sides actually wanted the same thing), or failing to trade an issue they cared little about for one they cared a lot about (logrolling).
2. Value CLAIMED — how did they split the zero-sum issues (salary, signing bonus) and did their outcome beat their walk-away? Note anchoring / first-offer dynamics if visible in the transcript.
3. Two concrete things to try next time.
6–9 sentences total. No jargon dumps, no headers, warm but honest.`;

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

  try {
    const facts = debriefFacts(analyze(terms, noDeal));
    const user_msg = `FACTS:\n${JSON.stringify(facts, null, 2)}\n\nTranscript excerpt:\n${transcript || "(none)"}`;
    const feedback = await coachReply(SYSTEM, user_msg);
    return Response.json({ feedback });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't build the debrief." }, { status: 502 });
  }
}
