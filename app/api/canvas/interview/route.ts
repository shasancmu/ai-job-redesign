import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, canvasInterviewReply } from "@/lib/ai";
import { getUserLanguage, withLanguage } from "@/lib/lang";
import { canvasByExercise } from "@/lib/canvases";

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

  const def = canvasByExercise(String(body.exercise || ""));
  if (!def) return Response.json({ error: "unknown canvas" }, { status: 400 });

  const messages = Array.isArray(body.messages) ? body.messages : [];
  try {
    const reply = await withLanguage(await getUserLanguage(supabase, user.id), () =>
      canvasInterviewReply(def.interviewSystem, def.subjectLabel, String(body.subject || "").slice(0, 400), messages)
    );
    return Response.json({ reply });
  } catch (e: any) {
    return Response.json({ error: e?.message || "The AI is unavailable." }, { status: 502 });
  }
}
