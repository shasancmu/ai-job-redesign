import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, hotSeatReportAI } from "@/lib/ai";
import { scenarioForCode } from "@/lib/earnings";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordExperimentOutcome } from "@/lib/experiments";
import { logConversation, variantForRun } from "@/lib/conversationLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Grade how the student-CEO handled the call. The private truth comes from the
// session code; the transcript comes from the run.
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
  setFlow("hotseat:report");

  const scn = scenarioForCode(code);
  try {
    const report = await hotSeatReportAI({
      scenario: { truth: scn.truth, narrative: scn.narrative },
      transcript: String(body.transcript || ""),
    });
    if (!report) return Response.json({ error: "Couldn't grade the call. Try again." }, { status: 502 });
    const hsKey = `${user!.id}:hot-seat`;
    const admin = createAdminClient();
    const score = typeof (report as any)?.score === "number" ? (report as any).score : null;
    try { await recordExperimentOutcome(admin, hsKey, { score, completed: true }); } catch { /* optional */ }
    try { await logConversation({ conversationId: hsKey, personId: user!.id, module: "hot-seat", outcome: score, intervention: await variantForRun(admin, hsKey), ended: true }); } catch { /* logging optional */ }
    return Response.json({ report });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
