import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { facilitatorAccess } from "@/lib/orgs";
import { gatherRoomDigest } from "@/lib/roomIntel";
import { roomPulseAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Live read of the whole cohort's in-progress work: emerging patterns, tensions,
// outliers. Facilitator-only, scoped to cohorts they manage.
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
  const cohort = String(body.cohort || "");
  if (!cohort) return Response.json({ error: "cohort required" }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  if (!access.superadmin) {
    const orgFilter = access.orgIds.length ? `,org_id.in.(${access.orgIds.join(",")})` : "";
    const { data: myClasses } = await admin.from("classes").select("code").or(`owner_id.eq.${user.id}${orgFilter}`);
    if (!((myClasses || []).map((c: any) => c.code).includes(cohort))) return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { digest, participantCount, activityCount } = await gatherRoomDigest(admin, cohort);
  if (!digest) return Response.json({ ok: true, empty: true, participantCount: 0, activityCount: 0 });

  const pulse = await roomPulseAI({ digest, participantCount }).catch(() => null);
  return Response.json({ ok: true, participantCount, activityCount, pulse });
}
