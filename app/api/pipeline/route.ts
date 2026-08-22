import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, pipelineAdviceAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Publication Pipeline back end. The simulation runs client-side; this only
// turns the computed numbers into a candid strategy. Auth-gated.
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
  setFlow("pipeline:advice");

  try {
    const advice = await pipelineAdviceAI({
      inputs: body.inputs || {},
      result: body.result || {},
      context: String(body.context || "").slice(0, 800),
    });
    if (!advice) return Response.json({ error: "Couldn't build the plan. Try again." }, { status: 502 });
    return Response.json({ advice });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
