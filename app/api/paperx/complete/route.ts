import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPaperx } from "@/lib/paperx/store";
import { normalizeCode } from "@/lib/classes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const makeCode = () => { const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let o = ""; for (let i = 0; i < 5; i++) o += c[Math.floor(Math.random() * c.length)]; return o; };

// Record that a learner finished a Paper Explainer (reached the teach-back).
// Writes a single `sessions` "done" row, keyed to exercise custom:<slug>, so it
// flows into the activity streak, progress, and the dashboard's assignment
// done-marking — the same completion signal every other module uses. Idempotent:
// re-finishing doesn't create duplicate completions.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "").trim();
  if (!slug) return Response.json({ error: "Missing explainer." }, { status: 400 });
  const cohort = body.cohort ? normalizeCode(String(body.cohort)) : null;

  // Visibility-check the same way the reader does.
  const g = await loadPaperx(slug, user.id);
  if (!g) return Response.json({ error: "Not found." }, { status: 404 });

  const admin = createAdminClient();
  const exercise = `custom:${slug}`;
  // Already completed? Keep it idempotent.
  const { data: existing } = await admin.from("sessions").select("id").eq("host_id", user.id).eq("exercise", exercise).eq("status", "done").limit(1);
  if (existing && existing.length) return Response.json({ ok: true, already: true });

  const { error } = await admin.from("sessions").insert({ code: makeCode(), host_id: user.id, status: "done", exercise, cohort });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
