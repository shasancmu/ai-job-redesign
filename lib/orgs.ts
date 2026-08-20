// ============================================================================
// Organizations = white-label tenants. This module is the single source of
// truth for tenant resolution and role checks (server-only).
//
// Roles:
//   platform_role: 'superadmin' | 'user'   (superadmin = you, the platform owner)
//   org_role:      'facilitator' | 'member' (per-organization, in org_members)
//
// A user can belong to several orgs. The "active" org (whose branding shows) is
// resolved from the URL slug when present, else a cookie, else their first org.
// ============================================================================

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

export type OrgRole = "facilitator" | "member";

export type OrgHighlight = { title: string; body: string };
export type OrgFaculty = { name: string; title?: string; image_url?: string };

export type Org = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  hero_image_url: string | null;
  primary_color: string | null;
  tagline: string | null;
  invite_only: boolean;
  plan: string;
  owner_id: string | null;
  modules: string[] | null; // module slugs this org grants; null/empty = all
  about: string | null; // short intro paragraph under the hero
  highlights: OrgHighlight[] | null; // institution-specific "why us" cards
  faculty: OrgFaculty[] | null; // key people, shown as circles
};

export type Membership = { org: Org; role: OrgRole };

const ACTIVE_ORG_COOKIE = "active_org";
// A sentinel cookie value meaning "the user explicitly chose Personal". Without
// it, an empty cookie is indistinguishable from "never chose", and we'd default
// a multi-org user straight back into their first org — making Personal unreachable.
const ACTIVE_ORG_PERSONAL = "__personal__";

function admin() {
  try { return createAdminClient(); } catch { return null; }
}

export async function getOrgBySlug(slug: string): Promise<Org | null> {
  const db = admin();
  if (!db || !slug) return null;
  const { data } = await db.from("organizations").select("*").eq("slug", slug.toLowerCase()).maybeSingle();
  return (data as Org) || null;
}

// Every org this user belongs to, with their role in each.
export async function getMyOrgs(userId: string): Promise<Membership[]> {
  const db = admin();
  if (!db || !userId) return [];
  const { data } = await db
    .from("org_members")
    .select("org_role, organizations(*)")
    .eq("user_id", userId);
  return (data || [])
    .map((r: any) => (r.organizations ? { org: r.organizations as Org, role: r.org_role as OrgRole } : null))
    .filter(Boolean) as Membership[];
}

export type RoleInfo = {
  superadmin: boolean;
  facilitatorOrgIds: string[];
  memberOrgIds: string[];
  memberships: Membership[];
};

// The caller's full role picture. superadmin is true from the env bootstrap
// (ADMIN_EMAILS) OR the platform_role column — the env list can never lock you
// out even if the DB is wrong.
export async function roleFor(user: { id: string; email?: string | null } | null): Promise<RoleInfo> {
  const empty: RoleInfo = { superadmin: false, facilitatorOrgIds: [], memberOrgIds: [], memberships: [] };
  if (!user) return empty;
  let superadmin = isAdmin(user.email);
  const db = admin();
  if (db && !superadmin) {
    const { data } = await db.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
    superadmin = (data as any)?.platform_role === "superadmin";
  }
  const memberships = await getMyOrgs(user.id);
  return {
    superadmin,
    facilitatorOrgIds: memberships.filter((m) => m.role === "facilitator").map((m) => m.org.id),
    memberOrgIds: memberships.map((m) => m.org.id),
    memberships,
  };
}

export async function isSuperadmin(user: { id: string; email?: string | null } | null): Promise<boolean> {
  return (await roleFor(user)).superadmin;
}

// Can this user reach the facilitator console, and scoped to which orgs?
// Superadmin sees everything; a facilitator sees only their org(s).
export async function facilitatorAccess(
  user: { id: string; email?: string | null } | null
): Promise<{ ok: boolean; superadmin: boolean; orgIds: string[] }> {
  const r = await roleFor(user);
  return { ok: r.superadmin || r.facilitatorOrgIds.length > 0, superadmin: r.superadmin, orgIds: r.facilitatorOrgIds };
}

// Resolve the branding/scope org for a request. Priority: an explicit slug (from
// a /{slug} URL) the user may access, else the cookie, else their first org.
export async function getActiveOrg(
  user: { id: string; email?: string | null } | null,
  slugFromUrl?: string
): Promise<Org | null> {
  if (slugFromUrl) {
    const org = await getOrgBySlug(slugFromUrl);
    if (org) return org;
  }
  if (!user) return null;
  const memberships = await getMyOrgs(user.id);
  if (memberships.length === 0) return null;
  const cookieSlug = cookies().get(ACTIVE_ORG_COOKIE)?.value;
  if (cookieSlug === ACTIVE_ORG_PERSONAL) return null; // explicit Personal
  if (cookieSlug) {
    const m = memberships.find((x) => x.org.slug === cookieSlug);
    if (m) return m.org;
  }
  return memberships[0].org;
}

// On sign-in, turn a pending email invite into a real membership. Idempotent.
// Returns the org the user was (or already is) a member of, if any matched.
export async function claimInvites(userId: string, email?: string | null): Promise<void> {
  const db = admin();
  if (!db || !email) return;
  const { data: invites } = await db.from("org_invites").select("org_id, org_role").eq("email", email.toLowerCase());
  for (const inv of invites || []) {
    await db.from("org_members").upsert(
      { org_id: (inv as any).org_id, user_id: userId, org_role: (inv as any).org_role },
      { onConflict: "org_id,user_id", ignoreDuplicates: true }
    );
  }
}

export { ACTIVE_ORG_COOKIE, ACTIVE_ORG_PERSONAL };
