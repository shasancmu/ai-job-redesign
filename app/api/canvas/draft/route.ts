import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, canvasDraftAI } from "@/lib/ai";
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
  const transcript = messages
    .map((m: any) => `${m.role === "user" ? "Them" : "Advisor"}: ${m.content}`)
    .join("\n");

  try {
    const result = await canvasDraftAI(def, String(body.subject || "").slice(0, 400), transcript.slice(0, 6000));
    const { _raw, ...canvas } = result;
    const filled = Object.values(canvas.fields || {}).some((v: any) => (Array.isArray(v) ? v.length : v));
    if (!filled && !canvas.synthesis) {
      return Response.json({ error: "The AI returned an empty canvas — try again." }, { status: 502 });
    }
    return Response.json({ ok: true, canvas });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't draft the canvas." }, { status: 502 });
  }
}
