import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, workflowInterviewReply, ChatMsg } from "@/lib/ai";
import { getUserLanguage, withLanguage } from "@/lib/lang";
import { createAdminClient } from "@/lib/supabase/admin";
import { experimentNudgeAuto } from "@/lib/experiments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const history: ChatMsg[] = Array.isArray(body.messages)
    ? body.messages
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-24)
        .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }))
    : [];

  try {
    let nudge = "";
    try { nudge = await experimentNudgeAuto(createAdminClient(), String(body.sessionId || "")); } catch {}
    const reply = await withLanguage(await getUserLanguage(supabase, user.id), () =>
      workflowInterviewReply(history, {
        name: String(body.name || "").slice(0, 200),
        description: String(body.description || "").slice(0, 1500),
      }, nudge)
    );
    return Response.json({ reply });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 502 });
  }
}
