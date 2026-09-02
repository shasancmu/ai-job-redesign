import { createClient } from "@/lib/supabase/server";
import { recordModuleEvent } from "@/lib/moduleEvents";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, canvasInterviewReply } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { getUserLanguage, withLanguage } from "@/lib/lang";
import { resolveCanvasDefForUser } from "@/lib/customModules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const def = await resolveCanvasDefForUser(String(body.exercise || ""), user.id);
  if (!def) return Response.json({ error: "unknown canvas" }, { status: 400 });
  setFlow("canvas:" + def.exercise);

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) await recordModuleEvent(def.exercise, "interview", "start", user.id);
  try {
    const lang = await getUserLanguage(supabase, user.id);
    return streamingResponse((emit) => withLanguage(lang, () =>
      canvasInterviewReply(def.interviewSystem, def.subjectLabel, String(body.subject || "").slice(0, 400), messages, emit, def.interviewStyle, def.interviewTurns)
    ));
  } catch (e: any) {
    return Response.json({ error: e?.message || "The AI is unavailable." }, { status: 502 });
  }
}
