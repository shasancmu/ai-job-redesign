import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";
import { sampleNextForRating, saveRating } from "@/lib/calibration";
import { logAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Human expert raters score runs to calibrate the AI grader. Raters are the experts
// — a superadmin, or any org director/instructor (faculty). They score blind: the
// endpoint never returns the AI's score or the run's arm.
async function canRate(user: any): Promise<boolean> {
  const r = await roleFor(user);
  return r.superadmin || r.directorOrgIds.length > 0 || r.instructorOrgIds.length > 0;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!(await canRate(user))) return Response.json({ error: "Raters must be a superadmin, director, or instructor." }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const admin = createAdminClient();

  if (body.action === "next") {
    const item = await sampleNextForRating(admin, user.id, body.module || undefined);
    return Response.json({ item }); // { item: null } when nothing left to rate
  }

  if (body.action === "rate") {
    const conversationId = String(body.conversationId || "");
    const score = Number(body.score);
    if (!conversationId || !Number.isFinite(score)) return Response.json({ error: "conversationId and score required" }, { status: 400 });
    await saveRating(admin, {
      conversationId, module: body.module || null, raterId: user.id, raterEmail: user.email,
      score, rubricVersion: body.rubricVersion || "v1", notes: body.notes || "",
    });
    await logAudit({ actorId: user.id, actorEmail: user.email, action: "calibration.rate", target: conversationId, meta: { module: body.module || null }, ip: clientIp(request) });
    const item = await sampleNextForRating(admin, user.id, body.module || undefined);
    return Response.json({ ok: true, item });
  }

  return Response.json({ error: "unknown action" }, { status: 400 });
}
