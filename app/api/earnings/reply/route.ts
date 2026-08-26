import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, roleplayReply } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { scenarioForCode, vossSystem } from "@/lib/earnings";
import { getUserLanguage, withLanguage } from "@/lib/lang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One turn of the earnings call: Voss answers the analyst. The scenario (hidden
// truth) is derived from the session code, so the label never touches the client.
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
  const code = String(body.code || "");
  if (!code) return Response.json({ error: "missing code" }, { status: 400 });
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  const scn = scenarioForCode(code);
  setFlow("earnings:reply");

  const lang = await getUserLanguage(supabase, user.id);
  return streamingResponse((emit) => withLanguage(lang, () => roleplayReply(vossSystem(scn), messages, emit)));
}
