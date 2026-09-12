import { createAdminClient } from "@/lib/supabase/admin";
import { orgFromBearer, scimError, toScimUser, parseScimUser, reconcileMembership, getOrgById, type ScimRow } from "@/lib/scim";
import { logAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function load(request: Request, id: string): Promise<{ org: any; row: ScimRow } | Response> {
  const org = await orgFromBearer(request);
  if (!org) return scimError(401, "Invalid or missing SCIM bearer token.");
  const admin = createAdminClient();
  const { data } = await admin.from("scim_users").select("*").eq("org_id", org.id).eq("id", id).maybeSingle();
  if (!data) return scimError(404, "User not found.");
  return { org, row: data as ScimRow };
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const r = await load(request, params.id);
  if (r instanceof Response) return r;
  return Response.json(toScimUser(r.row, new URL(request.url).origin), { headers: { "Content-Type": "application/scim+json" } });
}

// PUT — full replace of the resource.
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const r = await load(request, params.id);
  if (r instanceof Response) return r;
  const admin = createAdminClient();
  let body: any;
  try { body = await request.json(); } catch { return scimError(400, "Malformed request body.", "invalidSyntax"); }
  const p = parseScimUser(body);
  if (!p) return scimError(400, "userName is required.", "invalidValue");
  return applyUpdate(request, admin, r.org, r.row, {
    external_id: p.externalId, email: p.email, given_name: p.givenName, family_name: p.familyName, active: p.active, raw: body,
  });
}

// PATCH — SCIM PatchOp. The one operation that always matters is toggling `active`
// (Okta/Entra deprovision this way); we also apply name/email/externalId replaces.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const r = await load(request, params.id);
  if (r instanceof Response) return r;
  const admin = createAdminClient();
  let body: any;
  try { body = await request.json(); } catch { return scimError(400, "Malformed request body.", "invalidSyntax"); }
  const ops = Array.isArray(body?.Operations) ? body.Operations : [];
  const patch: Record<string, any> = {};
  for (const op of ops) {
    const verb = String(op?.op || "").toLowerCase();
    if (verb === "remove") continue; // we don't remove tracked scalar attrs
    const path = op?.path ? String(op.path).toLowerCase() : "";
    const val = op?.value;
    if (path === "active") patch.active = val !== false && val !== "False" && val !== "false";
    else if (path === "username") patch.user_name = String(val).toLowerCase();
    else if (path === "externalid") patch.external_id = val ? String(val) : null;
    else if (path === "name.givenname") patch.given_name = val ? String(val) : null;
    else if (path === "name.familyname") patch.family_name = val ? String(val) : null;
    else if (!path && val && typeof val === "object") {
      // Whole-object replace (no path): pick the attributes we track.
      if ("active" in val) patch.active = val.active !== false;
      if (val.userName) patch.user_name = String(val.userName).toLowerCase();
      if (val.externalId !== undefined) patch.external_id = val.externalId ? String(val.externalId) : null;
      if (val.name?.givenName !== undefined) patch.given_name = val.name.givenName ? String(val.name.givenName) : null;
      if (val.name?.familyName !== undefined) patch.family_name = val.name.familyName ? String(val.name.familyName) : null;
    }
  }
  if (!Object.keys(patch).length) return Response.json(toScimUser(r.row, new URL(request.url).origin), { headers: { "Content-Type": "application/scim+json" } });
  return applyUpdate(request, admin, r.org, r.row, patch);
}

// DELETE — deprovision. Soft: mark inactive and drop membership, keeping the row so
// the IdP's id stays resolvable. Returns 204.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const r = await load(request, params.id);
  if (r instanceof Response) return r;
  const admin = createAdminClient();
  const next: ScimRow = { ...r.row, active: false };
  await admin.from("scim_users").update({ active: false, updated_at: new Date().toISOString() }).eq("id", r.row.id);
  const full = (await getOrgById(r.org.id)) as any || r.org;
  await reconcileMembership(admin, full, next);
  await logAudit({ orgId: r.org.id, action: "scim.user.deactivate", target: r.row.email || r.row.user_name, ip: clientIp(request) });
  return new Response(null, { status: 204 });
}

// Persist a field patch, reconcile membership, and return the updated resource.
async function applyUpdate(request: Request, admin: any, org: any, row: ScimRow, patch: Record<string, any>): Promise<Response> {
  patch.updated_at = new Date().toISOString();
  const { data, error } = await admin.from("scim_users").update(patch).eq("id", row.id).select("*").single();
  if (error) return scimError(400, error.message);
  const next = data as ScimRow;
  const full = (await getOrgById(org.id)) as any || org;
  const uid = await reconcileMembership(admin, full, next);
  if (uid && uid !== next.user_id) await admin.from("scim_users").update({ user_id: uid }).eq("id", next.id);
  const wasActive = row.active, nowActive = next.active;
  if (wasActive !== nowActive) await logAudit({ orgId: org.id, action: nowActive ? "scim.user.provision" : "scim.user.deactivate", target: next.email || next.user_name, ip: clientIp(request) });
  return Response.json(toScimUser({ ...next, user_id: uid }, new URL(request.url).origin), { headers: { "Content-Type": "application/scim+json" } });
}
