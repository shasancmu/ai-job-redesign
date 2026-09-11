import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, problemHuntQueriesAI } from "@/lib/ai";
import { webEvidence, EVIDENCE_ENABLED } from "@/lib/cases/webResearch";
import { enforceGenerateLimit, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Corroborate the candidate problem against the real world: derive focused
// search queries from the transcript, run them (capped Tavily budget), and hand
// back the evidence block + real source links. Fails soft: if web search isn't
// configured, returns the derived problem with no evidence rather than erroring.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const rl = enforceGenerateLimit(user.id); if (!rl.ok) return tooMany(rl.retryAfter);

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const mode = body.mode === "leader" ? "leader" : "seller";
  const transcript = String(body.transcript || "").slice(0, 8000);
  if (!transcript.trim()) return Response.json({ error: "Nothing to check yet." }, { status: 400 });
  setFlow(`problem:${mode}:evidence`);

  try {
    const { problem, queries } = await problemHuntQueriesAI(mode, transcript);
    const ev = EVIDENCE_ENABLED ? await webEvidence(queries) : { block: "", sources: [] };
    return Response.json({ problem, queries, block: ev.block, sources: ev.sources, enabled: EVIDENCE_ENABLED });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't gather evidence." }, { status: 500 });
  }
}
