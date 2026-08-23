import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, interactionIdeaAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Anatomy of an Idea back end: assemble the idea + derive the mechanism's
// discriminating test. Auth-gated.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const x = String(body.x || "").trim();
  const y = String(body.y || "").trim();
  const z = String(body.z || "").trim();
  if (!x || !y || !z) return Response.json({ error: "Name X, Y, and Z first." }, { status: 400 });
  setFlow("interaction:idea");

  try {
    const idea = await interactionIdeaAI({
      x: x.slice(0, 200),
      y: y.slice(0, 200),
      z: z.slice(0, 200),
      direction: String(body.direction || "especially"),
      mechanism: String(body.mechanism || "").slice(0, 600),
      model: String(body.model || "").slice(0, 600),
      guess: String(body.guess || "").slice(0, 400),
    });
    if (!idea) return Response.json({ error: "Couldn't build the idea. Try again." }, { status: 502 });
    return Response.json({ idea });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
