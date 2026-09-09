import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPaperx } from "@/lib/paperx/store";
import { normalizeCode } from "@/lib/classes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const makeCode = () => { const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let o = ""; for (let i = 0; i < 5; i++) o += c[Math.floor(Math.random() * c.length)]; return o; };

// Record that a learner finished a Paper Explainer (reached the teach-back).
// Writes a single `sessions` "done" row keyed exercise custom:<slug> — the same
// completion signal every module uses (activity streak, dashboard done-marking,
// instructor analytics) — plus a `workspaces` row holding the teach-back score.
// Idempotent: re-finishing keeps one completion and only raises the best score.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "").trim();
  if (!slug) return Response.json({ error: "Missing explainer." }, { status: 400 });
  const cohort = body.cohort ? normalizeCode(String(body.cohort)) : null;
  const score = Number.isFinite(body.score) ? Math.max(0, Math.min(100, Math.round(body.score))) : null;
  const verdict = typeof body.verdict === "string" ? body.verdict.slice(0, 400) : "";

  const g = await loadPaperx(slug, user.id);
  if (!g) return Response.json({ error: "Not found." }, { status: 404 });

  const admin = createAdminClient();
  const exercise = `custom:${slug}`;
  const canvas = { paperx: true, score, verdict, at: new Date().toISOString() };

  const { data: existing } = await admin.from("sessions").select("id").eq("host_id", user.id).eq("exercise", exercise).eq("status", "done").limit(1);
  if (existing && existing.length) {
    // Already completed: keep only the best teach-back score.
    const sid = (existing[0] as any).id;
    if (score !== null) {
      const { data: ws } = await admin.from("workspaces").select("canvas").eq("session_id", sid).eq("author_id", user.id).maybeSingle();
      const prev = Number((ws as any)?.canvas?.score);
      if (!ws) await admin.from("workspaces").insert({ session_id: sid, author_id: user.id, canvas });
      else if (!Number.isFinite(prev) || score > prev) await admin.from("workspaces").update({ canvas }).eq("session_id", sid).eq("author_id", user.id);
    }
    return Response.json({ ok: true, already: true });
  }

  const sid = crypto.randomUUID();
  const { error } = await admin.from("sessions").insert({ id: sid, code: makeCode(), host_id: user.id, status: "done", exercise, cohort });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await admin.from("workspaces").insert({ session_id: sid, author_id: user.id, canvas }).then(() => {}, () => {});
  return Response.json({ ok: true });
}
