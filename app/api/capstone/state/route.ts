import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Signed-in members poll the shared team state.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").toUpperCase();
  if (!code) return Response.json({ error: "missing code" }, { status: 400 });

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("capstone_sessions")
    .select("id, phase, status, transcript, report")
    .eq("code", code)
    .maybeSingle();
  if (!session) return Response.json({ error: "Code not found." }, { status: 404 });

  const [{ data: members }, { data: picks }] = await Promise.all([
    admin.from("capstone_members").select("name, role, user_id, created_at").eq("session_id", session.id).order("created_at"),
    admin.from("capstone_picks").select("lever_key, selected, note, by_name").eq("session_id", session.id),
  ]);

  return Response.json({
    phase: session.phase,
    status: session.status,
    members: members || [],
    picks: (picks || []).filter((p: any) => p.selected),
    transcript: session.transcript || [],
    report: session.report || null,
  });
}
