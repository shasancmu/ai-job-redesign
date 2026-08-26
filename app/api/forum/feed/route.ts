import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC. The live message feed for a chat (the room is public in the room). Used
// by both the participants' phones and the shared screen.
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const code = String(body.code || "").toUpperCase().trim();
  if (!code) return Response.json({ error: "Missing code." }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "Not available." }, { status: 500 });
  }

  const { data: session } = await admin.from("forum_sessions").select("id, topic, status").eq("code", code).maybeSingle();
  if (!session) return Response.json({ error: "That code isn't valid." }, { status: 404 });

  const [{ data: recent }, { count }] = await Promise.all([
    admin.from("forum_messages").select("id, name, text, created_at").eq("session_id", session.id).order("created_at", { ascending: false }).limit(80),
    admin.from("forum_messages").select("id", { count: "exact", head: true }).eq("session_id", session.id),
  ]);
  const messages = ((recent as any[]) || []).slice().reverse();
  return Response.json({ ok: true, topic: session.topic, status: session.status, total: count ?? messages.length, messages });
}
