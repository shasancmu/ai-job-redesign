import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, paperStudyAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Understand a Paper back end: deconstruct a pasted paper through the four
// research frameworks. Auth-gated.
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
  const paper = String(body.paper || "").trim();
  if (paper.length < 120) {
    return Response.json({ error: "Paste a bit more of the paper (abstract and intro is enough)." }, { status: 400 });
  }
  setFlow("paper-study:study");

  try {
    const study = await paperStudyAI({ paper, context: String(body.context || "").slice(0, 800) });
    if (!study) return Response.json({ error: "Couldn't read the paper. Try again." }, { status: 502 });
    return Response.json({ study });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
