import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Records the two Kirkpatrick instruments the spine doesn't already have: the L1
// reaction and the L0 pre-judgment, keyed by the run's session code. Merges, so the
// pre (posted when the report reveals) and the reaction (posted on submit) can
// arrive separately. The post-competence (L2) and the randomized arm already live on
// the conversation spine / experiment_assignments and join back on this code.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const code = String(body.code || "").trim().toUpperCase();
  if (!code) return Response.json({ error: "bad request" }, { status: 400 });

  let admin;
  try { admin = createAdminClient(); } catch { return Response.json({ ok: false }); } // storage optional; never block a run

  // Resolve the run so we tag module/cohort and confirm it's the user's.
  const { data: session } = await admin.from("sessions").select("host_id, guest_id, exercise, cohort").eq("code", code).maybeSingle();
  if (!session) return Response.json({ ok: false });
  if ((session as any).host_id !== user.id && (session as any).guest_id !== user.id) {
    return Response.json({ error: "Not your run." }, { status: 403 });
  }

  const patch: Record<string, any> = {
    code, module: (session as any).exercise || null, cohort: (session as any).cohort || null,
    person_id: user.id, updated_at: new Date().toISOString(),
  };
  // Only set what was sent, so a later reaction doesn't clobber the earlier pre.
  if (body.reaction && typeof body.reaction === "object") {
    const a = Number(body.reaction.applicability);
    patch.reaction = { applicability: Number.isFinite(a) ? Math.max(1, Math.min(5, Math.round(a))) : null, comment: String(body.reaction.comment || "").slice(0, 500) || null };
  }
  if (body.prediction && typeof body.prediction === "object") {
    patch.prediction = { text: String(body.prediction.text || "").slice(0, 2000), why: String(body.prediction.why || "").slice(0, 2000) || null };
  }

  const { error } = await admin.from("learning_measures").upsert(patch, { onConflict: "code" });
  if (error) return Response.json({ ok: false }); // additive; never surface to the learner
  return Response.json({ ok: true });
}
