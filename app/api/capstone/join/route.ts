import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC: a student joins a team session by code, picking a name and role.
export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").toUpperCase();
  const name = String(body.name || "").trim().slice(0, 40);
  const role = String(body.role || "").trim().slice(0, 20);
  const userId = typeof body.userId === "string" && body.userId ? body.userId : null;
  if (!code || !name || !role) return Response.json({ error: "missing fields" }, { status: 400 });

  const admin = createAdminClient();
  const { data: session } = await admin.from("capstone_sessions").select("id, status").eq("code", code).maybeSingle();
  if (!session) return Response.json({ error: "Code not found." }, { status: 404 });

  // One row per (name); re-joining updates the role rather than duplicating.
  const { data: existing } = await admin.from("capstone_members").select("id").eq("session_id", session.id).eq("name", name).maybeSingle();
  if (existing) {
    await admin.from("capstone_members").update({ role, user_id: userId }).eq("id", existing.id);
  } else {
    await admin.from("capstone_members").insert({ session_id: session.id, name, role, user_id: userId });
  }
  return Response.json({ ok: true });
}
