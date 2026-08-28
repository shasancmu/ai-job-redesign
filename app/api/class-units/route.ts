import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { facilitatorAccess, getActiveOrg } from "@/lib/orgs";
import { MODULES } from "@/lib/modules";
import { listRoleplayCatalog } from "@/lib/mechanics/store";
import { listAssignableInterviewModules } from "@/lib/customModules";
import { listClassUnits, cohortCountsByClass } from "@/lib/classUnits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = new Set(MODULES.map((m) => m.slug));

// GET: the classes (dept/course tier) in the active org, with cohort counts.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const access = await facilitatorAccess(user);
  if (!access.ok) return new Response("Forbidden", { status: 403 });
  const activeOrg = await getActiveOrg(user);
  if (!activeOrg) return Response.json({ classes: [], orgId: null });
  const canManage = access.superadmin || access.orgIds.includes(activeOrg.id);
  const [units, counts] = await Promise.all([listClassUnits(activeOrg.id), cohortCountsByClass(activeOrg.id)]);
  return Response.json({ classes: units.map((u) => ({ ...u, cohorts: counts[u.id] || 0 })), orgId: activeOrg.id, canManage });
}

// POST: create or update a class (name + its inherited module set). Director /
// superadmin of the org only.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const access = await facilitatorAccess(user);
  if (!access.ok) return new Response("Forbidden", { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  const activeOrg = await getActiveOrg(user);
  if (!activeOrg) return Response.json({ error: "Switch to a school first." }, { status: 400 });
  if (!(access.superadmin || access.orgIds.includes(activeOrg.id))) return Response.json({ error: "Only a director can manage classes." }, { status: 403 });

  const name = String(body.name || "").trim();
  if (!name) return Response.json({ error: "Name required." }, { status: 400 });

  const [rpList, ivList] = await Promise.all([listRoleplayCatalog(), listAssignableInterviewModules(user.id)]);
  const dyn = new Set([...rpList.map((m) => m.slug), ...ivList.map((m) => m.slug)]);
  const modules = (Array.isArray(body.modules) ? body.modules : []).filter((s: string) => VALID.has(s) || dyn.has(s));

  let admin;
  try { admin = createAdminClient(); } catch { return Response.json({ error: "service role not set" }, { status: 500 }); }

  if (body.id) {
    const { data: existing } = await admin.from("class_units").select("org_id").eq("id", String(body.id)).maybeSingle();
    if (!existing || (existing as any).org_id !== activeOrg.id) return Response.json({ error: "Not found." }, { status: 404 });
    const { error } = await admin.from("class_units").update({ name, modules }).eq("id", String(body.id));
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, id: String(body.id) });
  }
  const { data, error } = await admin.from("class_units").insert({ org_id: activeOrg.id, name, modules }).select("id").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: (data as any)?.id });
}
