import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, interviewReply, proposeRedesign, ChatMsg } from "@/lib/ai";
import { getUserLanguage, withLanguage } from "@/lib/lang";
import { createAdminClient } from "@/lib/supabase/admin";
import { experimentNudgeAuto, resolveExercise } from "@/lib/experiments";
import { logConversation, messagesToTurns, variantForRun } from "@/lib/conversationLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!AI_ENABLED) {
    return Response.json({ error: "AI is not configured." }, { status: 400 });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const mode = body.mode === "propose" ? "propose" : "chat";
  setFlow("job:" + mode);
  const history: ChatMsg[] = Array.isArray(body.messages)
    ? body.messages
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-24)
        .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }))
    : [];
  const job = {
    title: String(body.jobTitle || "").slice(0, 200),
    description: String(body.jobDescription || "").slice(0, 1000),
  };

  const language = await getUserLanguage(supabase, user.id);
  const sessionId = String(body.sessionId || "");
  const admin = createAdminClient();
  // Label the conversation with the session's resolved exercise — the SAME key
  // the A/B engine uses as the flow — so the spine's `module` lines up with the
  // experiment flow (and the autopilot's per-flow baseline counts). Fall back to
  // the client-provided slug/module, then the generic label.
  const moduleName = (await resolveExercise(admin, sessionId)) || String(body.slug || body.module || "interview");
  try {
    if (mode === "propose") {
      // Context can come from the interview transcript (solo) or captured notes (paired).
      const context = body.notes
        ? String(body.notes).slice(0, 4000)
        : history.map((m) => `${m.role === "user" ? "Them" : "Interviewer"}: ${m.content}`).join("\n");
      const result = await withLanguage(language, () => proposeRedesign(context, job));
      // The interview produced its proposal — finalize the conversation spine.
      try {
        await logConversation({ conversationId: sessionId, personId: user.id, module: moduleName, turns: messagesToTurns(history), intervention: await variantForRun(admin, sessionId), ended: true });
      } catch { /* logging optional */ }
      return Response.json(result);
    }
    let nudge = "";
    try { nudge = await experimentNudgeAuto(admin, sessionId); } catch {}
    const reply = await withLanguage(language, () => interviewReply(history, job, nudge));
    // Persist the running conversation (both sides) keyed by session.
    try { await logConversation({ conversationId: sessionId, personId: user.id, module: moduleName, turns: messagesToTurns([...history, { role: "assistant", content: reply }]) }); } catch { /* logging optional */ }
    return Response.json({ reply });
  } catch (e: any) {
    return Response.json(
      { error: e?.message || "AI request failed." },
      { status: 502 }
    );
  }
}
