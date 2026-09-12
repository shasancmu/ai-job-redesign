import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSim } from "@/lib/ailab/sims";
import { runChallenge } from "@/lib/ailab/engine";
import { logConversation, type Turn } from "@/lib/conversationLog";
import { normalizeCode } from "@/lib/classes";
import { AI_ENABLED } from "@/lib/ai";

// Confirm the caller is actually enrolled in this cohort before we tag their run
// with it — never trust a cohort code from the client (it would let anyone
// contaminate a cohort study). Returns the code only if membership checks out.
async function verifiedCohort(userId: string, raw: string): Promise<string | null> {
  const code = normalizeCode(raw);
  if (!code) return null;
  try {
    const admin = createAdminClient();
    const { data: klass } = await admin.from("classes").select("id").eq("code", code).maybeSingle();
    if (!klass) return null;
    const { data: member } = await admin.from("class_members").select("user_id").eq("class_id", (klass as any).id).eq("user_id", userId).maybeSingle();
    return member ? code : null;
  } catch { return null; }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90; // the agent loop can take several model calls

// The AI Skills Lab run/record endpoint.
//   run    — grade one attempt against the challenge's rubric (stateless, fast).
//   finish — log the whole run to the conversation spine with the final L2
//            competence, so it flows into measurement (and the Level-1 within-module
//            experiment bridge in logConversation).
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const sim = getSim(String(body.sim || ""));
  if (!sim) return Response.json({ error: "Unknown simulator." }, { status: 404 });

  if (body.action === "run") {
    if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
    const challenge = sim.challenges.find((c) => c.id === String(body.challengeId || ""));
    if (!challenge) return Response.json({ error: "Unknown challenge." }, { status: 404 });
    try {
      const result = await runChallenge(sim, challenge, body.input || {});
      return Response.json(result);
    } catch (e: any) {
      return Response.json({ error: e?.message || "The run failed. Try again." }, { status: 500 });
    }
  }

  if (body.action === "finish") {
    const code = String(body.code || "").trim();
    const score = Number(body.score);
    const transcript: Turn[] = (Array.isArray(body.transcript) ? body.transcript : [])
      .filter((t: any) => t && typeof t.text === "string" && t.text.trim())
      .slice(0, 60)
      .map((t: any) => ({ speaker: t.speaker === "ai" ? "ai" : "human", text: String(t.text).slice(0, 8000) }));
    if (!code) return Response.json({ error: "missing code" }, { status: 400 });
    const cohort = body.cohort ? await verifiedCohort(user.id, String(body.cohort)) : null;
    try {
      await logConversation({
        conversationId: code, personId: user.id, module: sim.exercise,
        cohort,
        turns: transcript.length ? transcript : undefined,
        outcome: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null,
        ended: true,
      });
    } catch { /* logging is best-effort; never block the learner's finish */ }
    return Response.json({ ok: true });
  }

  return Response.json({ error: "unknown action" }, { status: 400 });
}
