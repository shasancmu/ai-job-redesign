import { createAdminClient } from "@/lib/supabase/admin";
import { AI_ENABLED, empathyInterviewReply, type EmpathyContext } from "@/lib/ai";
import { experimentNudge } from "@/lib/experiments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// PUBLIC, no-auth: one turn of a potential customer's empathy interview. Looked
// up by the owner's shared link token; the AI's questions are tailored by the
// owner's setup (business / offer / audience / goals) stored in their workspace.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "This interview isn't available right now." }, { status: 503 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const token = String(body.token || "");
  if (!token) return Response.json({ error: "Missing link." }, { status: 400 });

  // Sanitize the running history to a capped list of {role, content}.
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-40)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

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

  try {
    let nudge = "";
    try { nudge = await experimentNudge(admin, session.id, "empathy"); } catch {}
    const reply = await empathyInterviewReply(history, ctx, nudge);
    return Response.json({ reply });
  } catch (e: any) {
    return Response.json({ error: e?.message || "The interviewer is unavailable." }, { status: 500 });
  }
}
