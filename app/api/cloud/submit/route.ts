import { createAdminClient } from "@/lib/supabase/admin";
import { cleanPhrase, normalizePhrase } from "@/lib/cloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC, no-auth: a participant submits a phrase into a live word cloud, keyed
// by the short join code. Writes via the service role (bypasses RLS).
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const code = String(body.code || "").toUpperCase().trim();
  const text = cleanPhrase(body.text || "");
  const norm = normalizePhrase(body.text || "");
  if (!code) return Response.json({ error: "Missing code." }, { status: 400 });
  if (!norm) return Response.json({ error: "Type a word or short phrase." }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "Not available." }, { status: 500 });
  }

  const { data: session } = await admin
    .from("cloud_sessions")
    .select("id, status")
    .eq("code", code)
    .maybeSingle();
  if (!session) return Response.json({ error: "That code isn't valid." }, { status: 404 });
  if (session.status === "closed") {
    return Response.json({ error: "This word cloud is closed." }, { status: 409 });
  }

  const { error } = await admin.from("cloud_entries").insert({ session_id: session.id, text, norm });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
