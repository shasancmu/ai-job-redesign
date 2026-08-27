import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, roleplayExaminerAI } from "@/lib/ai";
import { getLiveSpec } from "@/lib/mechanics/liveStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The facilitator asks the AI to read the room's responses and synthesize them.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").toUpperCase();
  const admin = createAdminClient();
  const { data: session } = await admin.from("live_sessions").select("id, host_id, slug").eq("code", code).maybeSingle();
  if (!session || session.host_id !== user.id) return Response.json({ error: "not your room" }, { status: 403 });
  const spec = await getLiveSpec(session.slug);
  const { data: entries } = await admin.from("live_entries").select("text, choice").eq("session_id", session.id).limit(500);
  const lines = (entries || []).map((e: any) => e.text || e.choice).filter(Boolean);
  if (lines.length === 0) return Response.json({ error: "No responses yet." }, { status: 400 });
  setFlow(`live:${session.slug}:synthesize`);

  const system = `You are reading a live room's anonymous responses to a prompt and synthesizing them for the facilitator to reflect back. ${spec?.synthesizePrompt || "Find the main themes, the range of views, the outliers, and one sharp question to put back to the room."} Output ONLY JSON: {"themes":[{"title":"","gist":""}],"tension":"the main disagreement or range, if any","question":"one question to put back to the room"}. No em dashes.`;
  const userMsg = `Prompt: ${spec?.prompt || ""}\n\nResponses (${lines.length}):\n${lines.map((l: string) => "- " + l).join("\n").slice(0, 8000)}`;
  try {
    const synthesis = await roleplayExaminerAI(system, userMsg, 1500);
    return Response.json({ synthesis });
  } catch (e: any) { return Response.json({ error: e?.message || "Synthesis failed." }, { status: 500 }); }
}
