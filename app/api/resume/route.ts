import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, resumeInterviewReply, resumeVoiceInterviewReply, resumeReportAI } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { experimentNudge } from "@/lib/experiments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Refresh Your Résumé back end. Auth-gated (the owner). Modes:
//  chat   — the interview (set voice:true for the spoken variant's shorter turns)
//  report — the set of changes to make
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
  const source = body.source && typeof body.source === "object"
    ? { kind: body.source.kind === "linkedin" ? "linkedin" : "resume", text: String(body.source.text || "").slice(0, 12000) }
    : undefined;

  try {
    if (mode === "chat") {
      let nudge = "";
      try { nudge = await experimentNudge(createAdminClient(), String(body.sessionId || ""), "resume"); } catch {}
      const reply = body.voice
        ? await resumeVoiceInterviewReply(body.messages || [], { source }, nudge)
        : await resumeInterviewReply(body.messages || [], { source }, nudge);
      return Response.json({ reply });
    }
    if (mode === "report") {
      let nudge = "";
      try { nudge = await experimentNudge(createAdminClient(), String(body.sessionId || ""), "resume", "report"); } catch {}
      const report = await resumeReportAI({ source, interview: body.interview || [], nudge });
      if (!report) return Response.json({ error: "Couldn't build the changes. Try again." }, { status: 502 });
      return Response.json({ report });
    }
    return Response.json({ error: "unknown mode" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
