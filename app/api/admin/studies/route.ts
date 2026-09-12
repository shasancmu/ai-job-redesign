import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import { getStudy, assignCohorts, newSeed, type Study } from "@/lib/studies";
import { normalizeCode } from "@/lib/classes";
import { logAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Superadmin surface for cohort-level studies (Level 2). Creating a study freezes
// nothing; assigning cohorts is the moment of randomization (logged, so the audit
// trail is the pre-registration record). Starting a study makes its gates live.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!(await isSuperadmin(user))) return Response.json({ error: "Superadmin only." }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const action = String(body.action || "");
  const admin = createAdminClient();

  try {
    if (action === "create") {
      const name = String(body.name || "").trim();
      const slug = String(body.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (!name || !slug) return Response.json({ error: "name and slug are required" }, { status: 400 });
      const design = body.design === "stepped_wedge" ? "stepped_wedge" : "cluster";
      const row = {
        slug, name, design, metric: "competence",
        org_id: body.org_id || null,
        intake_code: body.intake_code ? normalizeCode(body.intake_code) : null,
        seed: newSeed(), status: "draft", created_by: user.id,
      };
      const { data, error } = await admin.from("studies").insert(row).select("*").single();
      if (error) return Response.json({ error: error.message.includes("duplicate") ? `The slug "${slug}" is taken.` : error.message }, { status: 400 });
      await logAudit({ actorId: user.id, actorEmail: user.email, orgId: row.org_id, action: "study.create", target: slug, meta: { design }, ip: clientIp(request) });
      return Response.json({ study: data });
    }

    const study = await getStudy(admin, String(body.id || body.slug || ""));
    if (!study) return Response.json({ error: "Study not found." }, { status: 404 });

    if (action === "assign") {
      const codes: string[] = (Array.isArray(body.cohortCodes) ? body.cohortCodes : String(body.cohortCodes || "").split(/[\s,]+/)).map((c: any) => normalizeCode(String(c))).filter(Boolean);
      if (!codes.length) return Response.json({ error: "Add at least one cohort code." }, { status: 400 });
      const rows = await assignCohorts(admin, study, codes, {
        arms: Array.isArray(body.arms) && body.arms.length >= 2 ? body.arms.map((a: any) => String(a)) : undefined,
        waves: body.waves ? Number(body.waves) : undefined,
        start: body.start || undefined,
        intervalDays: body.intervalDays ? Number(body.intervalDays) : undefined,
      });
      // The randomization is now frozen — record it as the pre-registration event.
      await logAudit({ actorId: user.id, actorEmail: user.email, orgId: study.org_id, action: "study.randomize", target: study.slug, meta: { design: study.design, seed: study.seed, assignments: rows.map((r) => ({ c: r.cohort_code, cond: r.condition, wave: r.wave, start: r.wave_start })) }, ip: clientIp(request) });
      return Response.json({ assignments: rows });
    }

    if (action === "status") {
      const status = ["draft", "running", "concluded"].includes(body.status) ? body.status : null;
      if (!status) return Response.json({ error: "bad status" }, { status: 400 });
      const patch: any = { status };
      if (status === "running" && !study.preregistered_at) patch.preregistered_at = new Date().toISOString();
      const { error } = await admin.from("studies").update(patch).eq("id", study.id);
      if (error) return Response.json({ error: error.message }, { status: 400 });
      await logAudit({ actorId: user.id, actorEmail: user.email, orgId: study.org_id, action: "study.status", target: study.slug, meta: { status }, ip: clientIp(request) });
      return Response.json({ ok: true });
    }

    if (action === "prereg") {
      const plan = String(body.plan || "").slice(0, 8000);
      const { error } = await admin.from("studies").update({ plan: { text: plan }, preregistered_at: new Date().toISOString() }).eq("id", study.id);
      if (error) return Response.json({ error: error.message }, { status: 400 });
      await logAudit({ actorId: user.id, actorEmail: user.email, orgId: study.org_id, action: "study.prereg", target: study.slug, ip: clientIp(request) });
      return Response.json({ ok: true });
    }

    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
