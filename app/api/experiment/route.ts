import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, experimentDraftAI, experimentDesignAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Strategy Experiment back end. Two actions:
//   draft  — turn a rough description into the eight canvas parts
//   design — turn the canvas into a critique + a data-generating process to run
// Auth-gated. The actual Monte Carlo simulation runs client-side.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  const action = String(body.action || "");

  try {
    if (action === "draft") {
      const idea = String(body.idea || "").trim();
      if (idea.length < 8) return Response.json({ error: "Describe your idea in a sentence or two first." }, { status: 400 });
      setFlow("experiment:draft");
      const canvas = await experimentDraftAI({ idea });
      if (!canvas) return Response.json({ error: "Couldn't draft the canvas. Try again." }, { status: 502 });
      return Response.json({ canvas });
    }
    if (action === "design") {
      const canvas = body.canvas && typeof body.canvas === "object" ? body.canvas : null;
      if (!canvas) return Response.json({ error: "Fill the canvas first." }, { status: 400 });
      setFlow("experiment:design");
      const design = await experimentDesignAI({ canvas });
      if (!design) return Response.json({ error: "Couldn't work the design through. Try again." }, { status: 502 });
      return Response.json({ design });
    }
    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
