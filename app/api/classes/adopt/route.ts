import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { facilitatorAccess } from "@/lib/orgs";
import { normalizeCode } from "@/lib/classes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Adopt a cohort's members' UNTAGGED sessions into the cohort. For runs done
// before auto-tagging existed (or without a ?cohort= link), this lets a director
// roll their members' work up under the cohort so it shows in results/summaries.
// Only claims sessions whose participants are all members of this cohort.
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
  const code = normalizeCode(body.code);
  if (!code) return Response.json({ error: "code required" }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  const { data: klass } = await admin.from("classes").select("id, owner_id, org_id").eq("code", code).maybeSingle();
  if (!klass) return Response.json({ error: "not found" }, { status: 404 });
  const canManage =
    klass.owner_id === user.id ||
    (klass.org_id && access.orgIds.includes(klass.org_id)) ||
    access.superadmin;
  if (!canManage) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { data: mems } = await admin.from("class_members").select("user_id").eq("class_id", klass.id);
  const members = [...new Set(((mems as any[]) || []).map((m) => m.user_id).filter(Boolean))];
  if (members.length === 0) return Response.json({ ok: true, adopted: 0 });

  // Paired sessions: both partners must be members. Solo sessions: the host is.
  const { data: pairedRows } = await admin
    .from("sessions")
    .update({ cohort: code })
    .is("cohort", null)
    .in("host_id", members)
    .in("guest_id", members)
    .select("id");
  const { data: soloRows } = await admin
    .from("sessions")
    .update({ cohort: code })
    .is("cohort", null)
    .is("guest_id", null)
    .in("host_id", members)
    .select("id");

  const adopted = (pairedRows?.length || 0) + (soloRows?.length || 0);
  return Response.json({ ok: true, adopted });
}
