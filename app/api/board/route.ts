import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, boardRoundAI, boardVerdictAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Your AI Board back end. Auth-gated. Modes: round (next debate round), verdict.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const mode = String(body.mode || "");
  const decision = String(body.decision || "");
  if (!decision.trim()) return Response.json({ error: "Describe the decision first." }, { status: 400 });

  try {
    if (mode === "round") {
      const round = await boardRoundAI({ decision, context: body.context, transcript: body.transcript || [] });
      if (!round.length) return Response.json({ error: "The board went quiet. Try again." }, { status: 502 });
      return Response.json({ round });
    }
    if (mode === "verdict") {
      const verdict = await boardVerdictAI({ decision, context: body.context, transcript: body.transcript || [] });
      if (!verdict) return Response.json({ error: "Couldn't reach a verdict. Try again." }, { status: 502 });
      return Response.json({ verdict });
    }
    return Response.json({ error: "unknown mode" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
