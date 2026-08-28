import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { facilitatorAccess, getActiveOrg } from "@/lib/orgs";
import { MODULES } from "@/lib/modules";
import { listRoleplayCatalog } from "@/lib/mechanics/store";
import { listAssignableInterviewModules } from "@/lib/customModules";
import { listClassUnits, cohortCountsByClass, uniqueClassSlug } from "@/lib/classUnits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = new Set(MODULES.map((m) => m.slug));

// GET: the classes (dept/course tier) in the active org. A director sees all of
// the org's classes; an instructor sees the ones they created. Each carries
// whether the caller can edit it.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const access = await facilitatorAccess(user);
  if (!access.ok) return new Response("Forbidden", { status: 403 });
  const activeOrg = await getActiveOrg(user);
  if (!activeOrg) return Response.json({ classes: [], orgId: null, canCreate: false });

  const isDirector = access.superadmin || access.orgIds.includes(activeOrg.id);
  const isInstructor = access.instructorOrgIds.includes(activeOrg.id);
  const canCreate = isDirector || isInstructor;

  const [all, counts] = await Promise.all([listClassUnits(activeOrg.id), cohortCountsByClass(activeOrg.id)]);
  const visible = isDirector ? all : all.filter((u) => u.owner_id === user.id);
  const classes = visible.map((u) => ({ ...u, cohorts: counts[u.id] || 0, canEdit: isDirector || u.owner_id === user.id }));
  return Response.json({ classes, orgId: activeOrg.id, canCreate });
}

// POST: create / update / duplicate a class. Any staff (director or instructor)
// of the org may create; you may edit a class you own, a director edits any.
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
  const isDirector = access.superadmin || access.orgIds.includes(activeOrg.id);
  const isInstructor = access.instructorOrgIds.includes(activeOrg.id);
  if (!(isDirector || isInstructor)) return Response.json({ error: "You need instructor status in this school to manage classes." }, { status: 403 });

  let admin;
  try { admin = createAdminClient(); } catch { return Response.json({ error: "service role not set" }, { status: 500 }); }
  const canEdit = async (id: string): Promise<boolean> => {
    const { data } = await admin.from("class_units").select("org_id, owner_id").eq("id", id).maybeSingle();
    if (!data || (data as any).org_id !== activeOrg.id) return false;
    return isDirector || (data as any).owner_id === user.id;
  };

  // Duplicate: clone a class's name + module set into a fresh, empty class (no
  // cohorts). The caller becomes its owner.
  if (body.duplicate) {
    const { data: src } = await admin.from("class_units").select("org_id, name, modules").eq("id", String(body.duplicate)).maybeSingle();
    if (!src || (src as any).org_id !== activeOrg.id) return Response.json({ error: "Not found." }, { status: 404 });
    const dupName = `${(src as any).name} (copy)`;
    const { data, error } = await admin.from("class_units").insert({ org_id: activeOrg.id, owner_id: user.id, name: dupName, slug: await uniqueClassSlug(activeOrg.id, dupName), modules: (src as any).modules || [] }).select("id").maybeSingle();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, id: (data as any)?.id });
  }

  const name = String(body.name || "").trim();
  if (!name) return Response.json({ error: "Name required." }, { status: 400 });
  const [rpList, ivList] = await Promise.all([listRoleplayCatalog(), listAssignableInterviewModules(user.id)]);
  const dyn = new Set([...rpList.map((m) => m.slug), ...ivList.map((m) => m.slug)]);
  const modules = (Array.isArray(body.modules) ? body.modules : []).filter((s: string) => VALID.has(s) || dyn.has(s));

  if (body.id) {
    if (!(await canEdit(String(body.id)))) return Response.json({ error: "You can't edit that class." }, { status: 403 });
    const { error } = await admin.from("class_units").update({ name, modules }).eq("id", String(body.id));
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, id: String(body.id) });
  }
  const { data, error } = await admin.from("class_units").insert({ org_id: activeOrg.id, owner_id: user.id, name, slug: await uniqueClassSlug(activeOrg.id, name), modules }).select("id").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: (data as any)?.id });
}
