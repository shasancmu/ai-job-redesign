import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, roleplayReply } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { counterpartSystem, scenarioByExercise } from "@/lib/negotiation";
import { getUserLanguage, withLanguage } from "@/lib/lang";
import { createAdminClient } from "@/lib/supabase/admin";
import { experimentNudge } from "@/lib/experiments";

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
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  const exercise = String(body.exercise || "negotiation");
  const scn = scenarioByExercise(exercise);
  if (!scn) return Response.json({ error: "unknown scenario" }, { status: 400 });
  setFlow("negotiation:reply");

  let nudge = ""; try { nudge = await experimentNudge(createAdminClient(), `${user.id}:${exercise}`, exercise, "interview"); } catch { /* optional */ }
  const base = counterpartSystem(scn);
  const system = nudge ? `${base}\n\nEXPERIMENT NOTE (stay in character, keep it subtle): ${nudge}` : base;
  const lang = await getUserLanguage(supabase, user.id);
  return streamingResponse((emit) => withLanguage(lang, () => roleplayReply(system, messages, emit)));
}
