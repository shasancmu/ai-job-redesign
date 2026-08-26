import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// HOST ONLY: advance the shared phase for the whole team.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").toUpperCase();
  const phase = Math.max(0, Math.min(4, Number(body.phase) || 0));
  if (!code) return Response.json({ error: "missing code" }, { status: 400 });

  const admin = createAdminClient();
  const { data: session } = await admin.from("capstone_sessions").select("id, host_id").eq("code", code).maybeSingle();
  if (!session || session.host_id !== user.id) return Response.json({ error: "not found" }, { status: 404 });

  await admin.from("capstone_sessions").update({ phase, updated_at: new Date().toISOString() }).eq("id", session.id);
  return Response.json({ ok: true, phase });
}
