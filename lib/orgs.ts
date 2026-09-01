// ============================================================================
// Organizations = white-label tenants. This module is the single source of
// truth for tenant resolution and role checks (server-only).
//
// Roles:
//   platform_role: 'superadmin' | 'user'              (superadmin = platform owner)
//   org_role:      'director' | 'instructor' | 'member' (per-organization)
//     - director   runs the whole org: instructor rights on EVERY cohort,
//                   manages people/branding, appoints instructors. Org-wide reach.
//     - instructor builds & runs their own cohorts; sees only those learners.
//     - member     a learner; in the org's master cohort + any sections.
//   ('facilitator' is the legacy name for 'director' and is normalized on read,
//    so nothing breaks before the migration runs.)
//
//   program director (program_directors table): the explicit MIDDLE tier, between
//   the org director and the instructor. Runs one or more CLASSES/programs
//   (class_units) as a P&L — its cohorts, the instructors under it, the alumni it
//   produces — without org-wide reach. It is a per-program grant, NOT an org_role
//   (a person can direct program A and be a plain member elsewhere), so it lives in
//   its own table and is surfaced here as programDirectorUnitIds. Independent of
//   class_units.owner_id: owning the modules ≠ running the program.
//
// A user can belong to several orgs. The "active" org (whose branding shows) is
// resolved from the URL slug when present, else a cookie, else their first org.
// ============================================================================

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

export type OrgRole = "director" | "instructor" | "member";

// Normalize a stored org_role, folding the legacy 'facilitator' into 'director'.
export function normalizeRole(raw: string | null | undefined): OrgRole {
  if (raw === "director" || raw === "facilitator") return "director";
  if (raw === "instructor") return "instructor";
  return "member";
}

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
  member_can_browse: boolean | null; // members see full library (true) or only their program (false/null)
  about: string | null; // short intro paragraph under the hero
  highlights: OrgHighlight[] | null; // institution-specific "why us" cards
  faculty: OrgFaculty[] | null; // key people, shown as circles
  presence_name: string | null; // what the org calls its remembering "presence"
  presence_voice: string | null; // how that presence speaks (tone/persona guidance)
  dpa_accepted_at: string | null; // when the org accepted the DPA
  dpa_accepted_by: string | null; // who accepted (name/email)
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

export async function getOrgById(id: string): Promise<Org | null> {
  const db = admin();
  if (!db || !id) return null;
  const { data } = await db.from("organizations").select("*").eq("id", id).maybeSingle();
  return (data as Org) || null;
}

// The "master cohort": a default class auto-created per org that every member
// belongs to. It gives an org an "everyone" group with a real cohort code, so
// live activities and roll-ups work org-wide with no sections. Deterministic,
// unique code from the org id (nobody types it — you join the org, not this).
export function masterCohortCode(orgId: string): string {
  return ("ORG-" + orgId.replace(/-/g, "").slice(0, 10)).toUpperCase();
}

// Create the org's master cohort if it doesn't exist yet; returns its code (or
// null if it can't be created — e.g. no owner to satisfy the classes FK).
export async function ensureMasterCohort(org: Pick<Org, "id" | "name" | "owner_id" | "modules">): Promise<string | null> {
  const db = admin();
  if (!db) return null;
  const code = masterCohortCode(org.id);
  const { data: existing } = await db.from("classes").select("code").eq("code", code).maybeSingle();
  if (existing) return code;
  if (!org.owner_id) return null; // classes.owner_id is NOT NULL
  const { error } = await db.from("classes").insert({
    code,
    name: `${org.name} — All members`,
    owner_id: org.owner_id,
    org_id: org.id,
    is_default: true,
    modules: org.modules || [],
  });
  return error ? null : code;
}

// Idempotently add a user to their org's master cohort.
export async function joinMasterCohort(userId: string, org: Pick<Org, "id" | "name" | "owner_id" | "modules">): Promise<void> {
  const db = admin();
  if (!db || !userId) return;
  const code = await ensureMasterCohort(org);
  if (!code) return;
  const { data: klass } = await db.from("classes").select("id").eq("code", code).maybeSingle();
  if (!klass) return;
  await db.from("class_members").upsert({ class_id: (klass as any).id, user_id: userId }, { onConflict: "class_id,user_id", ignoreDuplicates: true });
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
    .map((r: any) => (r.organizations ? { org: r.organizations as Org, role: normalizeRole(r.org_role) } : null))
    .filter(Boolean) as Membership[];
}

export type RoleInfo = {
  superadmin: boolean;
  directorOrgIds: string[];        // orgs this user runs (org-wide reach)
  instructorOrgIds: string[];      // orgs where they instruct (own cohorts only)
  programDirectorUnitIds: string[]; // class_units (programs) they direct — the middle tier
  programDirectorOrgIds: string[];  // orgs those programs live in (for roll-up scoping)
  memberOrgIds: string[];
  memberships: Membership[];
};

// The caller's full role picture. superadmin is true from the env bootstrap
// (ADMIN_EMAILS) OR the platform_role column — the env list can never lock you
// out even if the DB is wrong.
export async function roleFor(user: { id: string; email?: string | null } | null): Promise<RoleInfo> {
  const empty: RoleInfo = { superadmin: false, directorOrgIds: [], instructorOrgIds: [], programDirectorUnitIds: [], programDirectorOrgIds: [], memberOrgIds: [], memberships: [] };
  if (!user) return empty;
  let superadmin = isAdmin(user.email);
  const db = admin();
  if (db && !superadmin) {
    const { data } = await db.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
    superadmin = (data as any)?.platform_role === "superadmin";
  }
  const memberships = await getMyOrgs(user.id);
  // The middle tier: programs (class_units) this user directs. Its own table, so
  // it survives if the table isn't migrated yet (→ empty, nothing breaks).
  let programDirectorUnitIds: string[] = [];
  let programDirectorOrgIds: string[] = [];
  if (db) {
    try {
      const { data: pd } = await db.from("program_directors").select("class_unit_id, org_id").eq("user_id", user.id);
      const rows = (pd as any[]) || [];
      programDirectorUnitIds = rows.map((r) => r.class_unit_id).filter(Boolean);
      programDirectorOrgIds = [...new Set(rows.map((r) => r.org_id).filter(Boolean))];
    } catch { /* table not set up yet */ }
  }
  return {
    superadmin,
    directorOrgIds: memberships.filter((m) => m.role === "director").map((m) => m.org.id),
    instructorOrgIds: memberships.filter((m) => m.role === "instructor").map((m) => m.org.id),
    programDirectorUnitIds,
    programDirectorOrgIds,
    memberOrgIds: memberships.map((m) => m.org.id),
    memberships,
  };
}

// Does this user direct THIS specific program (class_unit)? Superadmin, an org
// director of the program's org, or an explicit program-director assignment.
export async function isProgramDirector(user: { id: string; email?: string | null } | null, classUnitId: string, orgId?: string): Promise<boolean> {
  if (!classUnitId) return false;
  const r = await roleFor(user);
  if (r.superadmin) return true;
  if (orgId && r.directorOrgIds.includes(orgId)) return true;
  return r.programDirectorUnitIds.includes(classUnitId);
}

export async function isSuperadmin(user: { id: string; email?: string | null } | null): Promise<boolean> {
  return (await roleFor(user)).superadmin;
}

// Director of any org, or superadmin. Gates the deep-tech power tools (Defense
// Impact, Batch scorer) so an org's directors can run them under their own login,
// without sharing one superadmin account.
export async function isDirectorOrAdmin(user: { id: string; email?: string | null } | null): Promise<boolean> {
  const r = await roleFor(user);
  return r.superadmin || r.directorOrgIds.length > 0;
}

// Can this user edit THIS org's branding (name, logo, hero, text)? Superadmin, or a
// director of that specific org. Directors get branding only — not slug, module
// entitlements, membership policy, or ownership (those stay superadmin).
export async function canEditOrgBranding(user: { id: string; email?: string | null } | null, orgId: string): Promise<boolean> {
  if (!orgId) return false;
  const r = await roleFor(user);
  return r.superadmin || r.directorOrgIds.includes(orgId);
}

// The single isolation resolver for the teaching console. Directors and
// instructors are "staff"; superadmin sees all. `orgIds` are the orgs the user
// runs org-wide (director) — the caller reads every cohort in them. Instructors
// get no org-wide reach; their scope is only the cohorts they own (owner_id),
// which the caller adds separately. This keeps one org OUT of another org's data.
export type StaffAccess = {
  ok: boolean;
  superadmin: boolean;
  orgIds: string[];          // director orgs → org-wide cohort reach
  instructorOrgIds: string[];
  programUnitIds: string[];  // programs (class_units) they direct → reach over that subtree
  programOrgIds: string[];   // orgs those programs live in
};
export async function orgStaffAccess(user: { id: string; email?: string | null } | null): Promise<StaffAccess> {
  const r = await roleFor(user);
  return {
    ok: r.superadmin || r.directorOrgIds.length > 0 || r.instructorOrgIds.length > 0 || r.programDirectorUnitIds.length > 0,
    superadmin: r.superadmin,
    orgIds: r.directorOrgIds,
    instructorOrgIds: r.instructorOrgIds,
    programUnitIds: r.programDirectorUnitIds,
    programOrgIds: r.programDirectorOrgIds,
  };
}
// Legacy alias — existing callers keep working while labels migrate.
export const facilitatorAccess = orgStaffAccess;

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

// The org a STAFF member (director / program director / instructor) is currently
// acting in — the active org if they staff it, else the first org they staff.
// The single resolver for staff-facing tools that serve all three tiers.
export async function staffActiveOrg(user: { id: string; email?: string | null } | null): Promise<Org | null> {
  if (!user) return null;
  const role = await roleFor(user);
  const staffOrgIds = new Set([...role.directorOrgIds, ...role.programDirectorOrgIds, ...role.instructorOrgIds]);
  const active = await getActiveOrg(user).catch(() => null);
  if (active && (role.superadmin || staffOrgIds.has(active.id))) return active;
  const anyId = role.directorOrgIds[0] || role.programDirectorOrgIds[0] || role.instructorOrgIds[0];
  if (anyId) return await getOrgById(anyId);
  if (role.superadmin && active) return active;
  return null;
}

// On sign-in, turn a pending email invite into a real membership. Idempotent.
// Returns the org the user was (or already is) a member of, if any matched.
export async function claimInvites(userId: string, email?: string | null): Promise<void> {
  const db = admin();
  if (!db || !email) return;
  const { data: invites } = await db.from("org_invites").select("org_id, org_role").eq("email", email.toLowerCase());
  for (const inv of invites || []) {
    await db.from("org_members").upsert(
      { org_id: (inv as any).org_id, user_id: userId, org_role: normalizeRole((inv as any).org_role) },
      { onConflict: "org_id,user_id", ignoreDuplicates: true }
    );
    // Everyone in the org belongs to its master cohort.
    const org = await getOrgById((inv as any).org_id);
    if (org) await joinMasterCohort(userId, org);
  }
}

export { ACTIVE_ORG_COOKIE, ACTIVE_ORG_PERSONAL };
