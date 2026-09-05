import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, caseGenomeAI } from "@/lib/ai";
import { sanitizeGenome, genomeComplete } from "@/lib/cases/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const idea = String(body.idea || "").trim().slice(0, 300);
  const decision = String(body.decision || "").trim().slice(0, 300);
  const protagonist = String(body.protagonist || "").trim().slice(0, 120);
  if (!idea || !decision) return Response.json({ error: "Give a business idea/company and a decision to teach." }, { status: 400 });

  setFlow("case-generate");
  try {
    const raw = await caseGenomeAI({ idea, decision, protagonist });
    const genome = sanitizeGenome(raw, idea);
    if (!genomeComplete(genome)) {
      return Response.json({ error: "The draft came back incomplete. Try a more specific idea and decision." }, { status: 502 });
    }
    return Response.json({ genome });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Failed to generate." }, { status: 500 });
  }
}
