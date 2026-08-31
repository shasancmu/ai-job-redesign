import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError } from "@/lib/scientifiq";
import { isSuperadmin } from "@/lib/orgs";
import { runResearchAgent } from "@/lib/researchAgent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Research Agent — one natural-language entry over the Scientifiq platform.
// Classifies the question, runs the matching capability, synthesizes an
// evidence-backed answer. Defense scoring is included only for superadmins
// (the Defense Impact model is superadmin-gated).
export async function POST(request: Request) {
  setFlow("research-agent");
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured." }, { status: 503 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const question = String(body.question || "").trim().slice(0, 4000);
  if (question.length < 4) return Response.json({ error: "Ask a question." }, { status: 400 });

  try {
    const res = await runResearchAgent(question, { includeDefense: await isSuperadmin(user) });
    return Response.json(res);
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "The agent failed." }, { status: 500 });
  }
}
