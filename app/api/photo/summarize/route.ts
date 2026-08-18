import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, photoSummaryAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Host-only: summarize the room's photos (from their stored text descriptions).
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const code = String(body.code || "").toUpperCase().trim();
  if (!code) return Response.json({ error: "Missing code." }, { status: 400 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const { data: session } = await supabase
    .from("photo_sessions")
    .select("id, prompt, host_id")
    .eq("code", code)
    .maybeSingle();
  if (!session || session.host_id !== user.id) return Response.json({ error: "Not found." }, { status: 404 });

  const { data: entries } = await supabase
    .from("photo_entries")
    .select("kind, title, description")
    .eq("session_id", session.id)
    .limit(500);
  if (!entries || entries.length === 0) {
    return Response.json({ error: "No photos yet to summarize." }, { status: 409 });
  }

  let summary;
  try {
    summary = await photoSummaryAI(session.prompt || "", entries as any);
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't summarize." }, { status: 500 });
  }

  await supabase.from("photo_sessions").update({ summary, updated_at: new Date().toISOString() }).eq("id", session.id);
  return Response.json({ ok: true, summary });
}
