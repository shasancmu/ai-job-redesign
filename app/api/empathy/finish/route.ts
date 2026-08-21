import { createAdminClient } from "@/lib/supabase/admin";
import { AI_ENABLED, empathyProfileAI, type EmpathyContext } from "@/lib/ai";

export const runtime = "nodejs";
import { setFlow } from "@/lib/aiflow";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// PUBLIC, no-auth: the customer finished the interview. Synthesize their empathy
// profile and store the transcript + profile as one row for the owner. Keyed by
// the shared link token; the service role bypasses RLS to insert.
export async function POST(request: Request) {
  setFlow("empathy:profile");
  if (!AI_ENABLED) return Response.json({ error: "This interview isn't available right now." }, { status: 503 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const token = String(body.token || "");
  if (!token) return Response.json({ error: "Missing link." }, { status: 400 });
  const name = String(body.name || "").slice(0, 120);

  const transcript = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-60)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

  const answered = transcript.filter((m: any) => m.role === "user").length;
  if (answered < 2) return Response.json({ error: "Please answer a couple of questions first." }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "Not available." }, { status: 500 });
  }

  const { data: session } = await admin.from("sessions").select("id, exercise").eq("public_token", token).maybeSingle();
  if (!session || session.exercise !== "empathy") return Response.json({ error: "This link isn't valid." }, { status: 404 });

  const { data: ws } = await admin.from("workspaces").select("canvas").eq("session_id", session.id).limit(1).maybeSingle();
  const canvas = (ws?.canvas as any) || {};
  const ctx: EmpathyContext = { business: canvas.business, offer: canvas.offer, audience: canvas.audience, goals: canvas.goals };

  let profile: any = null;
  try {
    profile = await empathyProfileAI({ transcript, ctx, name });
  } catch {
    /* store the transcript even if synthesis fails; the owner can re-run later */
  }

  const { error } = await admin.from("empathy_interviews").insert({
    session_id: session.id,
    respondent: name,
    transcript,
    profile,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
