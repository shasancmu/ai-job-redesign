import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, roleplayReply } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { counterpartSystem } from "@/lib/negotiation";
import { getNegScenario } from "@/lib/mechanics/negStore";
import { getUserLanguage, withLanguage } from "@/lib/lang";
import { createAdminClient } from "@/lib/supabase/admin";
import { experimentNudge } from "@/lib/experiments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The AI counterpart for an authored negotiation, driven by the stored (hidden)
// payoff table. Streams, like the built-in negotiation rooms.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  const slug = String(body.slug || "");
  const scn = await getNegScenario(slug);
  if (!scn) return Response.json({ error: "unknown scenario" }, { status: 400 });
  setFlow("mechanics:negotiation:reply");

  // A/B: an experiment on this module nudges the counterpart. Between-subjects key.
  let nudge = ""; try { nudge = await experimentNudge(createAdminClient(), `${user.id}:${slug}`, slug, "interview"); } catch { /* optional */ }
  const base = counterpartSystem(scn);
  const system = nudge ? `${base}\n\nEXPERIMENT NOTE (stay in character, keep it subtle): ${nudge}` : base;
  const lang = await getUserLanguage(supabase, user.id);
  return streamingResponse((emit) => withLanguage(lang, () => roleplayReply(system, messages, emit)));
}
