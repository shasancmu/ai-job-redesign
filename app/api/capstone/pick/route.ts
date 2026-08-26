import { createAdminClient } from "@/lib/supabase/admin";
import { LEVER_BY_KEY } from "@/lib/capstone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC: a member toggles a lever on or off for the team, or edits its note.
export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").toUpperCase();
  const lever = String(body.lever || "");
  const selected = body.selected !== false;
  const note = typeof body.note === "string" ? body.note.slice(0, 600) : undefined;
  const byName = String(body.name || "").slice(0, 40);
  if (!code || !LEVER_BY_KEY[lever]) return Response.json({ error: "bad request" }, { status: 400 });

  const admin = createAdminClient();
  const { data: session } = await admin.from("capstone_sessions").select("id").eq("code", code).maybeSingle();
  if (!session) return Response.json({ error: "Code not found." }, { status: 404 });

  const row: any = { session_id: session.id, lever_key: lever, selected, by_name: byName, updated_at: new Date().toISOString() };
  if (note !== undefined) row.note = note;
  await admin.from("capstone_picks").upsert(row, { onConflict: "session_id,lever_key" });
  return Response.json({ ok: true });
}
