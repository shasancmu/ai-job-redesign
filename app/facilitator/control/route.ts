import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, UNTAGGED } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Broadcast control over every room in a cohort:
//   op "goto"    -> move all rooms to a specific step (phase)
//   op "message" -> push a nudge banner to all rooms
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const { cohort = UNTAGGED, op } = body;
  const untagged = cohort === UNTAGGED;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  const now = new Date().toISOString();
  let patch: Record<string, any> = {};

  if (op === "goto") {
    const phase = Math.max(0, Math.min(20, parseInt(body.phase, 10) || 0));
    patch = { phase, phase_started_at: now, status: "active" };
  } else if (op === "message") {
    const msg = String(body.message || "").slice(0, 240);
    if (!msg) return Response.json({ error: "empty message" }, { status: 400 });
    patch = { broadcast_msg: msg, broadcast_at: now };
  } else {
    return Response.json({ error: "unknown op" }, { status: 400 });
  }

  let q = admin.from("sessions").update(patch);
  q = untagged ? q.is("cohort", null) : q.eq("cohort", cohort);
  const { error, count } = await q.select("id");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, updated: count ?? null });
}
