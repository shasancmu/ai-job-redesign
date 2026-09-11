import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, problemHuntReply } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { getUserLanguage, withLanguage } from "@/lib/lang";
import { enforceChatLimit, tooMany } from "@/lib/ratelimit";
import { huntInterviewSystem, HUNT, type HuntMode } from "@/lib/problemhunt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One turn of the Problem Hunt interview (seller or leader mode). Auth-gated.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const rl = enforceChatLimit(user.id); if (!rl.ok) return tooMany(rl.retryAfter);

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const mode: HuntMode = body.mode === "leader" ? "leader" : "seller";
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  setFlow(`problem:${mode}`);

  const system = huntInterviewSystem(mode);
  const turns = HUNT[mode].interviewTurns;
  const lang = await getUserLanguage(supabase, user.id);
  return streamingResponse((emit) => withLanguage(lang, () => problemHuntReply(system, messages, turns, undefined, emit)));
}
