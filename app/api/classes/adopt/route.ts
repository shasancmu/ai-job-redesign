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

  // Reset: untag every session in this cohort (back to null). For cleaning up an
  // over-broad pull before re-running a narrower one.
  if (body.reset) {
    const { data } = await admin.from("sessions").update({ cohort: null }).eq("cohort", code).select("id");
    return Response.json({ ok: true, reset: data?.length || 0 });
  }

  const { data: mems } = await admin.from("class_members").select("user_id").eq("class_id", klass.id);
  const members = [...new Set(((mems as any[]) || []).map((m) => m.user_id).filter(Boolean))];
  if (members.length === 0) return Response.json({ ok: true, adopted: 0 });

  // Reliable: PAIRED job/workflow runs where BOTH partners are members of this
  // cohort. That's the actual class run, and it can't be confused with personal
  // testing (a solo tester never has a member partner).
  const { data: pairedRows } = await admin
    .from("sessions")
    .update({ cohort: code })
    .is("cohort", null)
    .in("exercise", ["job", "workflow"])
    .in("host_id", members)
    .in("guest_id", members)
    .select("id");
  let adopted = pairedRows?.length || 0;

  // Solo runs carry no org context, so the only signal is recency. When a day
  // window is given, also claim members' solo sessions created within it (the
  // class date), which excludes a director's older test history.
  const days = Math.max(0, Math.min(120, Number(body.sinceDays) || 0));
  if (days > 0) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data: soloRows } = await admin
      .from("sessions")
      .update({ cohort: code })
      .is("cohort", null)
      .is("guest_id", null)
      .in("host_id", members)
      .gte("created_at", since)
      .select("id");
    adopted += soloRows?.length || 0;
  }

  return Response.json({ ok: true, adopted });
}
