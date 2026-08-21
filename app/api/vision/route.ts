import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, visionInterviewReply, visionReportAI } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { getUserLanguage, withLanguage } from "@/lib/lang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const mode = String(body.mode || "");
  const ctx = { name: body?.ctx?.name || "", does: body?.ctx?.does || "" };
  const lang = await getUserLanguage(supabase, user.id);

  try {
    if (mode === "chat") {
      const messages: Msg[] = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
      return streamingResponse((emit) => withLanguage(lang, () => visionInterviewReply(messages, ctx, emit)));
    }
    if (mode === "report") {
      const interview: Msg[] = Array.isArray(body.interview) ? body.interview : [];
      const transcript = interview.map((m) => `${m.role === "user" ? "Leader" : "Facilitator"}: ${m.content}`).join("\n").slice(0, 8000);
      const report = await withLanguage(lang, () => visionReportAI({ ctx, transcript }));
      return Response.json({ report });
    }
    return Response.json({ error: "unknown mode" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "The facilitator is unavailable." }, { status: 502 });
  }
}
