import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";
import { localizeCustomModule } from "@/lib/customModules";
import { logAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Translating a whole spec is one model call plus a couple of DB round-trips.
export const maxDuration = 90;

// Publish an AI-translated copy of a custom module in another language. Allowed for
// a superadmin, or a director of the module's org (never a plain member). Global
// modules (no org) are superadmin-only.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const sourceSlug = String(body.slug || "").trim();
  const language = String(body.language || "").trim();
  if (!sourceSlug || !language) return Response.json({ error: "A module and a language are required." }, { status: 400 });

  const admin = createAdminClient();
  const { data: mod } = await admin.from("custom_modules").select("org_id, name").eq("slug", sourceSlug).maybeSingle();
  if (!mod) return Response.json({ error: "Module not found." }, { status: 404 });
  const modOrg = (mod as any).org_id as string | null;

  const role = await roleFor(user);
  const allowed = role.superadmin || (!!modOrg && role.directorOrgIds.includes(modOrg));
  if (!allowed) return Response.json({ error: "Only a superadmin or the module's organization director can publish a language copy." }, { status: 403 });

  const res = await localizeCustomModule({ sourceSlug, language, operatorId: user.id, orgId: modOrg });
  if ("error" in res) return Response.json({ error: res.error }, { status: 400 });

  await logAudit({ actorId: user.id, actorEmail: user.email, orgId: modOrg, action: "module.localize", target: res.slug, meta: { source: sourceSlug, language }, ip: clientIp(request) });
  return Response.json({ ok: true, slug: res.slug, name: res.name });
}
