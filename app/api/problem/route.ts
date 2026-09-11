import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, problemHuntReply, problemHuntQueriesAI, problemHuntReportAI } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { getUserLanguage, withLanguage } from "@/lib/lang";
import { enforceChatLimit, tooMany } from "@/lib/ratelimit";
import { webEvidence, EVIDENCE_ENABLED } from "@/lib/cases/webResearch";
import { huntInterviewSystem, HUNT, type HuntMode } from "@/lib/problemhunt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// The combined endpoint the shared VoiceInterview engine talks to. mode "chat"
// streams one spoken interview turn; mode "report" gathers the web evidence AND
// builds the graded report in one shot (the voice flow has no separate evidence
// step). The hunt mode (seller/leader) rides in as `hunt`, since `mode` is taken.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const rl = enforceChatLimit(user.id); if (!rl.ok) return tooMany(rl.retryAfter);

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const hunt: HuntMode = body.hunt === "leader" ? "leader" : "seller";
  const mode = body.mode === "report" ? "report" : "chat";

  if (mode === "chat") {
    const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
    setFlow(`problem:${hunt}:voice`);
    const system = huntInterviewSystem(hunt);
    const turns = HUNT[hunt].interviewTurns;
    const lang = await getUserLanguage(supabase, user.id);
    return streamingResponse((emit) => withLanguage(lang, () => problemHuntReply(system, messages, turns, undefined, emit)));
  }

  // report: interview → transcript → evidence → graded report
  const interview = Array.isArray(body.interview) ? body.interview : [];
  const transcript = interview.map((m: any) => `${m.role === "user" ? "Them" : "Coach"}: ${String(m.content || "")}`).join("\n").slice(0, 9000);
  if (!transcript.trim()) return Response.json({ error: "Do the interview first." }, { status: 400 });
  setFlow(`problem:${hunt}:voice:report`);
  try {
    const { problem, queries } = await problemHuntQueriesAI(hunt, transcript);
    const ev = EVIDENCE_ENABLED ? await webEvidence(queries) : { block: "", sources: [] };
    const report = await problemHuntReportAI({ mode: hunt, transcript, problem, evidence: ev.block, sources: ev.sources });
    if (!report) return Response.json({ error: "Couldn't build the report. Try again." }, { status: 502 });
    return Response.json({ report });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
