import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, coachReply } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { convoByKey, COACH_SYSTEM } from "@/lib/hardconvo";
import { getUserLanguage, withLanguage } from "@/lib/lang";
import { logConversation } from "@/lib/conversationLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A coach evaluates how the user handled the conversation, from the transcript.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const transcript = String(body.transcript || "").slice(0, 4000);
  const convo = convoByKey(String(body.convoKey || ""));
  if (!convo) return Response.json({ error: "unknown scenario" }, { status: 400 });
  setFlow("hard-convo:debrief");

  const user_msg = `SCENARIO: ${convo.name} — ${convo.youRole} speaking with ${convo.counterpartName} (${convo.counterpartRole}).\nThe situation: ${convo.situation}\nWhat good looks like: ${convo.yourGoal}\n\nTranscript:\n${transcript || "(none)"}`;
  // Finalize the hard-conversation spine (the debrief marks the practice as complete).
  try { await logConversation({ conversationId: `${user.id}:hard-convo:${String(body.convoKey || "")}`, personId: user.id, module: "hard-convo", ended: true }); } catch { /* logging optional */ }
  const lang = await getUserLanguage(supabase, user.id);
  return streamingResponse((emit) => withLanguage(lang, () => coachReply(COACH_SYSTEM, user_msg, 0.6, emit)));
}
