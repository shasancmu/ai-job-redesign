import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, UNTAGGED } from "@/lib/admin";
import { PHASES } from "@/lib/exercise";
import { WORKFLOW_STEPS } from "@/lib/workflow";
import { SOLO_STEPS } from "@/lib/solo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });

  const cohort = new URL(request.url).searchParams.get("cohort") || UNTAGGED;
  const untagged = cohort === UNTAGGED;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service role not set" }, { status: 500 });
  }

  let q = admin
    .from("sessions")
    .select("id, code, exercise, phase, status, phase_started_at, host_id, guest_id, created_at")
    .order("created_at", { ascending: false });
  q = untagged ? q.is("cohort", null) : q.eq("cohort", cohort);
  const { data: sessions } = await q;

  const ids = new Set<string>();
  (sessions || []).forEach((s: any) => {
    if (s.host_id) ids.add(s.host_id);
    if (s.guest_id) ids.add(s.guest_id);
  });
  let profiles: any[] = [];
  if (ids.size) {
    const { data } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", Array.from(ids));
    profiles = data || [];
  }
  const nameOf = (id?: string | null) =>
    (id && profiles.find((p) => p.id === id)?.display_name) || null;

  const rooms = (sessions || []).map((s: any) => {
    const steps =
      s.exercise === "workflow"
        ? WORKFLOW_STEPS
        : s.exercise === "solo"
          ? SOLO_STEPS
          : PHASES;
    const step = steps[s.phase] || steps[0];
    return {
      id: s.id,
      code: s.code,
      exercise: s.exercise || "job",
      phase: s.phase,
      totalPhases: steps.length,
      stepTitle: step?.title || `Step ${s.phase + 1}`,
      minutes: (step as any)?.minutes ?? null,
      status: s.status,
      phase_started_at: s.phase_started_at,
      host: nameOf(s.host_id),
      guest: nameOf(s.guest_id),
    };
  });

  return Response.json({ rooms, now: new Date().toISOString() });
}
