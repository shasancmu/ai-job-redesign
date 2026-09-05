import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, caseGenomeFromMaterialsAI } from "@/lib/ai";
import { sanitizeGenome, genomeComplete } from "@/lib/cases/sanitize";
import { researchForCase } from "@/lib/cases/webResearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// The "Living Case" authoring copilot. Takes the instructor's brief + uploaded
// source text (from AutoBuild), optionally enriches it with real web research,
// and drafts a full interactive case genome. Returns plain JSON { spec } — the
// AutoBuild client falls back to JSON when the response isn't an event-stream.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const intent = String(body.intent || "").trim().slice(0, 2000);
  const sourceText = String(body.sourceText || "").trim().slice(0, 12000);
  const opinion = body.opinion === "high" ? "high" : "low";
  if (!intent && !sourceText) return Response.json({ error: "Give a topic or some materials to build from." }, { status: 400 });

  setFlow("mechanics:case-copilot");
  try {
    // Web research (real sources, quotes, videos) — capped + guard-railed; a miss
    // or the monthly cap simply means no research block, never a failed draft.
    const research = await researchForCase(intent, sourceText).catch(() => "");
    const raw = await caseGenomeFromMaterialsAI({ intent, sourceText, opinion, research });
    const genome = sanitizeGenome(raw, intent || "Case");
    if (!genomeComplete(genome)) return Response.json({ error: "The draft came back incomplete. Add a clearer brief or more materials." }, { status: 502 });
    return Response.json({ spec: genome });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Failed to draft the case." }, { status: 500 });
  }
}
