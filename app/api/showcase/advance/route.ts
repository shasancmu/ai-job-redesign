import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// HOST ONLY: move to a given item, or close the session.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").toUpperCase();
  if (!code) return Response.json({ error: "missing code" }, { status: 400 });

  const admin = createAdminClient();
  const { data: session } = await admin.from("showcase_sessions").select("id, host_id, items").eq("code", code).maybeSingle();
  if (!session || session.host_id !== user.id) return Response.json({ error: "not found" }, { status: 404 });

  const patch: any = { updated_at: new Date().toISOString() };
  if (typeof body.current === "number") {
    const max = (Array.isArray(session.items) ? session.items.length : 1) - 1;
    patch.current = Math.max(-1, Math.min(max, Math.round(body.current)));
  }
  if (typeof body.status === "string" && ["open", "closed"].includes(body.status)) patch.status = body.status;

  await admin.from("showcase_sessions").update(patch).eq("id", session.id);
  return Response.json({ ok: true });
}
