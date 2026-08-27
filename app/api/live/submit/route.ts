import { createAdminClient } from "@/lib/supabase/admin";
import { cleanPhrase, normalizePhrase } from "@/lib/cloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC, no-auth: a participant submits into a live activity by its join code.
// Writes via the service role (bypasses RLS). One-submit gating is client-side.
export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").toUpperCase().trim();
  if (!code) return Response.json({ error: "no code" }, { status: 400 });
  const text = cleanPhrase(body.text || "").slice(0, 400);
  const choice = String(body.choice || "").slice(0, 120);
  const norm = normalizePhrase(body.text || "");
  if (!text && !choice) return Response.json({ error: "empty" }, { status: 400 });
  try {
    const admin = createAdminClient();
    const { data: session } = await admin.from("live_sessions").select("id, status").eq("code", code).maybeSingle();
    if (!session) return Response.json({ error: "room not found" }, { status: 404 });
    if (session.status === "closed") return Response.json({ error: "This activity is closed." }, { status: 409 });
    await admin.from("live_entries").insert({ session_id: session.id, text, choice, norm });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Couldn't submit." }, { status: 500 }); }
}
