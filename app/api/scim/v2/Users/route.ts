import { createAdminClient } from "@/lib/supabase/admin";
import { orgFromBearer, scimError, toScimUser, parseScimUser, reconcileMembership, getOrgById, LIST_SCHEMA, type ScimRow } from "@/lib/scim";
import { logAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /Users — list, or filter by `userName eq "x"` (how Okta/Entra check whether a
// user already exists before creating). Supports startIndex/count paging.
export async function GET(request: Request) {
  const org = await orgFromBearer(request);
  if (!org) return scimError(401, "Invalid or missing SCIM bearer token.");
  const base = new URL(request.url).origin;
  const url = new URL(request.url);
  const admin = createAdminClient();

  const filter = url.searchParams.get("filter") || "";
  const startIndex = Math.max(1, parseInt(url.searchParams.get("startIndex") || "1", 10) || 1);
  const count = Math.max(0, Math.min(200, parseInt(url.searchParams.get("count") || "100", 10) || 100));

  let q = admin.from("scim_users").select("*", { count: "exact" }).eq("org_id", org.id);
  const m = filter.match(/userName\s+eq\s+"([^"]+)"/i);
  if (m) q = q.eq("user_name", m[1].toLowerCase());
  q = q.order("created_at", { ascending: true }).range(startIndex - 1, startIndex - 1 + (count || 1) - 1);

  const { data, count: total } = await q;
  const rows = (data as ScimRow[]) || [];
  return Response.json({
    schemas: [LIST_SCHEMA],
    totalResults: total ?? rows.length,
    startIndex,
    itemsPerPage: count === 0 ? 0 : rows.length,
    Resources: count === 0 ? [] : rows.map((r) => toScimUser(r, base)),
  }, { headers: { "Content-Type": "application/scim+json" } });
}

// POST /Users — provision a user. Idempotent on (org, userName): a repeat create
// returns the existing resource (409) so the IdP reconciles cleanly.
export async function POST(request: Request) {
  const org = await orgFromBearer(request);
  if (!org) return scimError(401, "Invalid or missing SCIM bearer token.");
  const base = new URL(request.url).origin;
  const admin = createAdminClient();

  let body: any;
  try { body = await request.json(); } catch { return scimError(400, "Malformed request body.", "invalidSyntax"); }
  const p = parseScimUser(body);
  if (!p) return scimError(400, "userName is required.", "invalidValue");

  const { data: existing } = await admin.from("scim_users").select("*").eq("org_id", org.id).eq("user_name", p.userName).maybeSingle();
  if (existing) return scimError(409, "A user with this userName already exists.", "uniqueness");

  const insert = {
    org_id: org.id, external_id: p.externalId, user_name: p.userName, email: p.email,
    given_name: p.givenName, family_name: p.familyName, active: p.active, raw: body, updated_at: new Date().toISOString(),
  };
  const { data, error } = await admin.from("scim_users").insert(insert).select("*").single();
  if (error) return scimError(400, error.message);
  const row = data as ScimRow;

  const full = (await getOrgById(org.id)) as any || org;
  const uid = await reconcileMembership(admin, full, row);
  if (uid && uid !== row.user_id) await admin.from("scim_users").update({ user_id: uid }).eq("id", row.id);
  await logAudit({ orgId: org.id, action: "scim.user.provision", target: row.email || row.user_name, meta: { external_id: row.external_id }, ip: clientIp(request) });

  return Response.json(toScimUser({ ...row, user_id: uid }, base), { status: 201, headers: { "Content-Type": "application/scim+json" } });
}
