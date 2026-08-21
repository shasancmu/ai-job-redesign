import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, roleplayReply } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { convoByKey, recipientSystem } from "@/lib/hardconvo";
import { getUserLanguage, withLanguage } from "@/lib/lang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The AI plays the person receiving the hard news, reacting in character.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  const convo = convoByKey(String(body.convoKey || ""));
  if (!convo) return Response.json({ error: "unknown scenario" }, { status: 400 });

  const lang = await getUserLanguage(supabase, user.id);
  return streamingResponse((emit) => withLanguage(lang, () => roleplayReply(recipientSystem(convo), messages, emit)));
}
