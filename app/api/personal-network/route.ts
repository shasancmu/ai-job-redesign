import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, personalNetworkInterviewReply, personalNetworkFeedbackAI } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { createAdminClient } from "@/lib/supabase/admin";
import { experimentNudge } from "@/lib/experiments";
import { computeEgoMetrics, type Contact, type Ties } from "@/lib/egonet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Map Your Personal Network back end. Auth-gated. Modes: chat (interview),
// report (feedback grounded in the computed ego-network statistics). Metrics are
// computed server-side from the roster + ties so the report can't be gamed by a
// bad client payload.
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
  setFlow("personal-network:" + (mode || "chat"));

  try {
    if (mode === "chat") {
      let nudge = "";
      try { nudge = await experimentNudge(createAdminClient(), String(body.sessionId || ""), "personal-network"); } catch {}
      return streamingResponse((emit) => personalNetworkInterviewReply(body.messages || [], { roster: body.roster, goal: body.goal }, nudge, emit));
    }
    if (mode === "report") {
      const contacts: Contact[] = Array.isArray(body.contacts) ? body.contacts : [];
      const ties: Ties = body.ties && typeof body.ties === "object" ? body.ties : {};
      const metrics = computeEgoMetrics(contacts, ties);
      if (metrics.size < 3) return Response.json({ error: "Add at least 3 contacts first." }, { status: 400 });

      let nudge = "";
      try { nudge = await experimentNudge(createAdminClient(), String(body.sessionId || ""), "personal-network", "report"); } catch {}
      const report = await personalNetworkFeedbackAI({
        metrics,
        contacts: contacts.map((c) => ({ name: c.name, domain: c.domain, strength: c.strength, energy: c.energy })),
        interview: body.interview || [],
        goal: body.goal,
        nudge,
      });
      if (!report) return Response.json({ error: "Couldn't read your network. Try again." }, { status: 502 });
      return Response.json({ report, metrics });
    }
    return Response.json({ error: "unknown mode" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
