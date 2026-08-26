import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { facilitatorAccess } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Facilitator toggles whether an individual response (session) is hidden from the
// cohort view and its roll-ups. Gated to staff who can manage the session's cohort.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const access = await facilitatorAccess(user);
  if (!access.ok) return new Response("Forbidden", { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const code = String(body.code || "").toUpperCase();
  const hidden = !!body.hidden;
  if (!code) return Response.json({ error: "code required" }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  const { data: session } = await admin.from("sessions").select("id, cohort").eq("code", code).maybeSingle();
  if (!session) return Response.json({ error: "not found" }, { status: 404 });

  // You can hide a response only in a cohort you manage.
  if (!access.superadmin) {
    if (!session.cohort) return Response.json({ error: "Forbidden" }, { status: 403 });
    const { data: klass } = await admin.from("classes").select("owner_id, org_id").eq("code", session.cohort).maybeSingle();
    const canManage = !!klass && (klass.owner_id === user.id || (klass.org_id && access.orgIds.includes(klass.org_id)));
    if (!canManage) return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("sessions").update({ hidden }).eq("id", session.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, hidden });
}
