// SCIM 2.0 (RFC 7643/7644) helpers: bearer-token auth, resource shaping, and the
// reconciliation between a SCIM User and this app's membership tables.
//
// The IdP authenticates each request with the org's SCIM bearer token; the org is
// derived FROM that token (sha256 → organizations.scim_token_hash), so every SCIM
// request is inherently scoped to one org — there is no cross-org surface.
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgById, joinMasterCohort } from "@/lib/orgs";

export const USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
export const LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";
export const ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

// A URL-safe token to hand the customer once. Store only its hash.
export function newToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(30).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export type ScimOrg = { id: string; name: string; slug: string; owner_id: string | null; modules: string[] | null };

// Resolve the org from the request's bearer token, or null (→ 401).
export async function orgFromBearer(request: Request): Promise<ScimOrg | null> {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const hash = hashToken(m[1].trim());
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("organizations").select("id, name, slug, owner_id, modules").eq("scim_token_hash", hash).maybeSingle();
    return (data as ScimOrg) || null;
  } catch { return null; }
}

export type ScimRow = {
  id: string; org_id: string; external_id: string | null; user_name: string; email: string | null;
  given_name: string | null; family_name: string | null; active: boolean; user_id: string | null;
  created_at: string; updated_at: string;
};

// Shape a stored row as a SCIM User resource.
export function toScimUser(row: ScimRow, baseUrl: string) {
  return {
    schemas: [USER_SCHEMA],
    id: row.id,
    externalId: row.external_id || undefined,
    userName: row.user_name,
    name: (row.given_name || row.family_name) ? { givenName: row.given_name || undefined, familyName: row.family_name || undefined } : undefined,
    emails: row.email ? [{ value: row.email, primary: true }] : undefined,
    active: row.active,
    meta: { resourceType: "User", created: row.created_at, lastModified: row.updated_at, location: `${baseUrl}/api/scim/v2/Users/${row.id}` },
  };
}

export function scimError(status: number, detail: string, scimType?: string) {
  return Response.json({ schemas: [ERROR_SCHEMA], detail, status: String(status), ...(scimType ? { scimType } : {}) }, { status, headers: { "Content-Type": "application/scim+json" } });
}

// Pull the fields we track out of an inbound SCIM User body.
export function parseScimUser(body: any): { userName: string; email: string | null; externalId: string | null; givenName: string | null; familyName: string | null; active: boolean } | null {
  const userName = String(body?.userName || "").trim().toLowerCase();
  if (!userName) return null;
  const emails = Array.isArray(body?.emails) ? body.emails : [];
  const primary = emails.find((e: any) => e?.primary) || emails[0];
  const email = String(primary?.value || (userName.includes("@") ? userName : "")).trim().toLowerCase() || null;
  return {
    userName,
    email,
    externalId: body?.externalId ? String(body.externalId) : null,
    givenName: body?.name?.givenName ? String(body.name.givenName) : null,
    familyName: body?.name?.familyName ? String(body.name.familyName) : null,
    active: body?.active !== false,
  };
}

// Find the auth account for an email, if one exists (paginated; best-effort).
async function findAuthUserId(admin: any, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users || [];
    for (const u of users) if ((u.email || "").toLowerCase() === target) return u.id;
    if (users.length < 1000) break;
  }
  return null;
}

// Reconcile a SCIM row to membership: active → invite + (if the account exists)
// immediate membership and cohort join; inactive → drop membership + invite. The
// invite means a not-yet-registered provisioned user joins on first sign-in.
export async function reconcileMembership(admin: any, org: ScimOrg, row: ScimRow): Promise<string | null> {
  if (!row.email) return row.user_id;
  try {
    if (row.active) {
      await admin.from("org_invites").upsert({ org_id: org.id, email: row.email, org_role: "member" }, { onConflict: "org_id,email" });
      const uid = row.user_id || (await findAuthUserId(admin, row.email));
      if (uid) {
        await admin.from("org_members").upsert({ org_id: org.id, user_id: uid, org_role: "member" }, { onConflict: "org_id,user_id" });
        await joinMasterCohort(uid, org as any).catch(() => {});
      }
      return uid;
    } else {
      await admin.from("org_invites").delete().eq("org_id", org.id).eq("email", row.email);
      if (row.user_id) await admin.from("org_members").delete().eq("org_id", org.id).eq("user_id", row.user_id);
      return row.user_id;
    }
  } catch { return row.user_id; }
}

export const runtimeCommon = "nodejs";

// Re-export so the routes can resolve the full org for cohort provisioning.
export { getOrgById };
