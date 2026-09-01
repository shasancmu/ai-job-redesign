import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";
import { listProgramDirectors, resolveOrgMemberByEmail, assignProgramDirector, removeProgramDirector } from "@/lib/programDirectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Program-director assignment for a CLASS/program (class_unit). Appointing is
// org-director (or superadmin) only — a program director can't grow the ranks
// above them. Listing is open to anyone who can see the program (a director, or
// the program's own directors/owner). Every action resolves the unit's org and
// checks the caller against THAT org — the isolation boundary.
async function unitOrg(admin: any, unitId: string): Promise<string | null> {
  if (!unitId) return null;
  const { data } = await admin.from("class_units").select("org_id").eq("id", unitId).maybeSingle();
  return (data as any)?.org_id || null;
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const unitId = new URL(request.url).searchParams.get("unit") || "";
  if (!unitId) return Response.json({ error: "Missing program." }, { status: 400 });

  let admin; try { admin = createAdminClient(); } catch { return Response.json({ error: "service role not set" }, { status: 500 }); }
  const orgId = await unitOrg(admin, unitId);
  if (!orgId) return Response.json({ error: "Not found." }, { status: 404 });

  const r = await roleFor(user);
  const isOrgDirector = r.superadmin || r.directorOrgIds.includes(orgId);
  const isProgramDirector = r.programDirectorUnitIds.includes(unitId);
  // A program's owner may also see who runs it.
  const { data: unit } = await admin.from("class_units").select("owner_id").eq("id", unitId).maybeSingle();
  const isOwner = (unit as any)?.owner_id === user.id;
  if (!(isOrgDirector || isProgramDirector || isOwner)) return new Response("Forbidden", { status: 403 });

  const directors = await listProgramDirectors(unitId);
  return Response.json({ directors, canManage: isOrgDirector });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  let body: any; try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const unitId = String(body.unit || "");
  const email = String(body.email || "");
  if (!unitId) return Response.json({ error: "Missing program." }, { status: 400 });

  let admin; try { admin = createAdminClient(); } catch { return Response.json({ error: "service role not set" }, { status: 500 }); }
  const orgId = await unitOrg(admin, unitId);
  if (!orgId) return Response.json({ error: "Not found." }, { status: 404 });

  const r = await roleFor(user);
  if (!(r.superadmin || r.directorOrgIds.includes(orgId))) return Response.json({ error: "Only a school director can appoint program directors." }, { status: 403 });

  const resolved = await resolveOrgMemberByEmail(orgId, email);
  if (resolved.error || !resolved.userId) return Response.json({ error: resolved.error || "Couldn't find that person." }, { status: 400 });

  const res = await assignProgramDirector({ classUnitId: unitId, orgId, userId: resolved.userId, assignedBy: user.id });
  if (!res.ok) return Response.json({ error: res.error || "Couldn't appoint." }, { status: 500 });
  const directors = await listProgramDirectors(unitId);
  return Response.json({ ok: true, directors });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  let body: any; try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const unitId = String(body.unit || "");
  const userId = String(body.userId || "");
  if (!unitId || !userId) return Response.json({ error: "Missing program or person." }, { status: 400 });

  let admin; try { admin = createAdminClient(); } catch { return Response.json({ error: "service role not set" }, { status: 500 }); }
  const orgId = await unitOrg(admin, unitId);
  if (!orgId) return Response.json({ error: "Not found." }, { status: 404 });

  const r = await roleFor(user);
  if (!(r.superadmin || r.directorOrgIds.includes(orgId))) return Response.json({ error: "Only a school director can change program directors." }, { status: 403 });

  const res = await removeProgramDirector(unitId, userId);
  if (!res.ok) return Response.json({ error: res.error || "Couldn't remove." }, { status: 500 });
  const directors = await listProgramDirectors(unitId);
  return Response.json({ ok: true, directors });
}
