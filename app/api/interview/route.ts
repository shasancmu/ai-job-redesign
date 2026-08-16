import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, interviewReply, proposeRedesign, ChatMsg } from "@/lib/ai";

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

  try {
    if (mode === "propose") {
      // Context can come from the interview transcript (solo) or captured notes (paired).
      const context = body.notes
        ? String(body.notes).slice(0, 4000)
        : history.map((m) => `${m.role === "user" ? "Them" : "Interviewer"}: ${m.content}`).join("\n");
      const result = await proposeRedesign(context, job);
      return Response.json(result);
    }
    const reply = await interviewReply(history, job);
    return Response.json({ reply });
  } catch (e: any) {
    return Response.json(
      { error: e?.message || "AI request failed." },
      { status: 502 }
    );
  }
}
