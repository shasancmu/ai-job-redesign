import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, roleplayReply, starHireCandidateSystem } from "@/lib/ai";
import { streamingResponse } from "@/lib/stream";
import { unsealScenario } from "@/lib/starhire/seal";
import { getUserLanguage, withLanguage } from "@/lib/lang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One turn of an interview: a candidate answers the student. The hidden truth
// comes from the sealed blob the client holds (unsealed server-side), so the
// candidate can concede to sharp questions without the answer key touching the
// client in readable form.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 400 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  const scn = unsealScenario(String(body.sealed || ""));
  if (!scn) return Response.json({ error: "This challenge has expired. Start a new one." }, { status: 400 });
  const candidate = scn.candidates.find((c) => c.id === String(body.candidateId || ""));
  if (!candidate) return Response.json({ error: "Unknown candidate." }, { status: 400 });

  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
  setFlow("starhire:reply");
  const system = starHireCandidateSystem(scn, candidate);

  const lang = await getUserLanguage(supabase, user.id);
  return streamingResponse((emit) => withLanguage(lang, () => roleplayReply(system, messages, emit)));
}
