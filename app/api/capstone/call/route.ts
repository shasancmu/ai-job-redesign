import { createAdminClient } from "@/lib/supabase/admin";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, roleplayReply } from "@/lib/ai";
import { capstoneAnalystSystem } from "@/lib/capstone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// PUBLIC: the shared analyst call. A member answers as the CFO; the AI analyst
// replies. Both turns append to the session transcript, which the team polls.
// Non-streaming so every teammate sees the same exchange.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").toUpperCase();
  const name = String(body.name || "").slice(0, 40);
  const text = String(body.text || "").trim().slice(0, 1200);
  if (!code) return Response.json({ error: "missing code" }, { status: 400 });
  setFlow("capstone:call");

  const admin = createAdminClient();
  const { data: session } = await admin.from("capstone_sessions").select("id, transcript").eq("code", code).maybeSingle();
  if (!session) return Response.json({ error: "Code not found." }, { status: 404 });

  const { data: picks } = await admin.from("capstone_picks").select("lever_key, selected").eq("session_id", session.id);
  const keys = (picks || []).filter((p: any) => p.selected).map((p: any) => p.lever_key);

  const transcript: any[] = Array.isArray(session.transcript) ? session.transcript : [];
  if (text) transcript.push({ role: "cfo", name, content: text });

  const history = transcript.map((t) => ({ role: t.role === "analyst" ? "assistant" : "user", content: t.content } as { role: "user" | "assistant"; content: string }));
  let reply = "";
  try {
    // Main model (low:false): this is the graded call, worth the quality.
    reply = (await roleplayReply(capstoneAnalystSystem(keys), history, undefined, { low: false, opener: "(The CFO's office has joined the call. Open with your first pointed question.)" })) || "";
  } catch (e: any) {
    return Response.json({ error: e?.message || "The analyst could not respond." }, { status: 500 });
  }
  if (reply.trim()) transcript.push({ role: "analyst", name: "Priya Anand", content: reply.trim() });

  await admin.from("capstone_sessions").update({ transcript, updated_at: new Date().toISOString() }).eq("id", session.id);
  return Response.json({ ok: true, transcript });
}
