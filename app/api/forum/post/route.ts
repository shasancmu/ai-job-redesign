import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC, no sign-in. Post a message into an open group chat.
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const code = String(body.code || "").toUpperCase().trim();
  const name = String(body.name || "").slice(0, 40).trim();
  const text = String(body.text || "").slice(0, 800).trim();
  if (!code || !text) return Response.json({ error: "Type a message." }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "Not available." }, { status: 500 });
  }

  const { data: session } = await admin.from("forum_sessions").select("id, status").eq("code", code).maybeSingle();
  if (!session) return Response.json({ error: "That code isn't valid." }, { status: 404 });
  if (session.status === "closed") return Response.json({ error: "This chat is closed." }, { status: 409 });

  const { error } = await admin.from("forum_messages").insert({ session_id: session.id, name, text });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
