import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A signed-in student joins a team by code, picking a name and role. Accounts
// are required to participate, and seats are unique (max four to a team).
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in to join a team." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").toUpperCase();
  const name = String(body.name || "").trim().slice(0, 40);
  const role = String(body.role || "").trim().slice(0, 20);
  if (!code || !name || !role) return Response.json({ error: "missing fields" }, { status: 400 });

  const admin = createAdminClient();
  const { data: session } = await admin.from("capstone_sessions").select("id").eq("code", code).maybeSingle();
  if (!session) return Response.json({ error: "Team code not found." }, { status: 404 });

  const { data: members } = await admin.from("capstone_members").select("id, user_id, role").eq("session_id", session.id);
  const mine = (members || []).find((m: any) => m.user_id === user.id);

  // Seat already held by someone else on the team.
  const seatHolder = (members || []).find((m: any) => m.role === role && m.user_id !== user.id);
  if (seatHolder) return Response.json({ error: "That seat is already taken. Pick another." }, { status: 409 });

  if (mine) {
    await admin.from("capstone_members").update({ role, name }).eq("id", mine.id);
    return Response.json({ ok: true });
  }

  // New member: enforce a maximum of four to a team.
  if ((members || []).length >= 4) return Response.json({ error: "This team is full (4 of 4)." }, { status: 409 });
  await admin.from("capstone_members").insert({ session_id: session.id, name, role, user_id: user.id });
  return Response.json({ ok: true });
}
