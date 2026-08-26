import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, earningsReportAI } from "@/lib/ai";
import { scenarioForCode } from "@/lib/earnings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Grade the interrogation. The scenario answer key comes from the session code;
// the transcript and verdict come from the run. Returns the report JSON, which
// the client saves into the workspace canvas.
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
  const code = String(body.code || "");
  if (!code) return Response.json({ error: "missing code" }, { status: 400 });
  setFlow("earnings:report");

  const scn = scenarioForCode(code);
  const verdict = {
    call: String(body.verdict?.call || "cant_tell"),
    confidence: Math.max(0, Math.min(100, Number(body.verdict?.confidence) || 0)),
    flip: String(body.verdict?.flip || ""),
  };

  try {
    const report = await earningsReportAI({
      scenario: { truth: scn.truth, narrative: scn.narrative, tell: scn.tell, naiveAI: scn.naiveAI, dimensions: scn.dimensions },
      transcript: String(body.transcript || ""),
      verdict,
    });
    if (!report) return Response.json({ error: "Couldn't grade the call. Try again." }, { status: 502 });
    return Response.json({ report });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
