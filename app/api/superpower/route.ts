import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, superpowerInterviewReply, superpowerReportAI } from "@/lib/ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { experimentNudge } from "@/lib/experiments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Find Your Superpower back end. Auth-gated. Modes: chat (interview), report.
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

  try {
    if (mode === "chat") {
      let nudge = "";
      try { nudge = await experimentNudge(createAdminClient(), String(body.sessionId || ""), "superpower"); } catch {}
      const reply = await superpowerInterviewReply(body.messages || [], { seeds: body.seeds }, nudge);
      return Response.json({ reply });
    }
    if (mode === "report") {
      const report = await superpowerReportAI({ seeds: body.seeds, interview: body.interview || [] });
      if (!report) return Response.json({ error: "Couldn't build the report. Try again." }, { status: 502 });
      return Response.json({ report });
    }
    return Response.json({ error: "unknown mode" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
