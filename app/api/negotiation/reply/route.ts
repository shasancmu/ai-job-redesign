import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, roleplayReply } from "@/lib/ai";
import { counterpartSystem, scenarioByExercise } from "@/lib/negotiation";
import { getUserLanguage, withLanguage } from "@/lib/lang";

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
  const scn = scenarioByExercise(String(body.exercise || "negotiation"));
  if (!scn) return Response.json({ error: "unknown scenario" }, { status: 400 });

  try {
    const reply = await withLanguage(await getUserLanguage(supabase, user.id), () => roleplayReply(counterpartSystem(scn), messages));
    return Response.json({ reply });
  } catch (e: any) {
    return Response.json({ error: e?.message || "The counterpart is unavailable." }, { status: 502 });
  }
}
