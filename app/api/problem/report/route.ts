import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, problemHuntReportAI } from "@/lib/ai";
import { enforceGenerateLimit, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// Grade the hunt and produce the final report (seller thesis or leader map),
// weaving in the real web evidence. Auth-gated.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const rl = enforceGenerateLimit(user.id); if (!rl.ok) return tooMany(rl.retryAfter);

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const mode = body.mode === "leader" ? "leader" : "seller";
  const transcript = String(body.transcript || "").slice(0, 9000);
  if (!transcript.trim()) return Response.json({ error: "Do the interview first." }, { status: 400 });
  const sources = Array.isArray(body.sources) ? body.sources.filter((s: any) => s && s.url).map((s: any) => ({ title: String(s.title || "Source"), url: String(s.url) })).slice(0, 10) : [];
  setFlow(`problem:${mode}:report`);

  try {
    const report = await problemHuntReportAI({
      mode, transcript,
      problem: String(body.problem || ""),
      evidence: String(body.block || ""),
      sources,
    });
    if (!report) return Response.json({ error: "Couldn't build the report. Try again." }, { status: 502 });
    return Response.json({ report });
  } catch (e: any) {
    return Response.json({ error: e?.message || "AI request failed." }, { status: 500 });
  }
}
