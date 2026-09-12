// Server-side helpers for author-built modules. This is the ONLY path that
// touches custom_modules: it loads a BuilderSpec, enforces visibility (global,
// or an org you belong to), and compiles it to a runnable CanvasDef with the
// author's org branding. Runs on the server with the service-role client; every
// caller passes the acting user so org isolation is enforced here.

import { createAdminClient } from "@/lib/supabase/admin";
import { canvasByExercise, type CanvasDef } from "@/lib/canvases";
import { moduleBySlug } from "@/lib/modules";
import { getMyOrgs, isOrgMember } from "@/lib/orgs";
import { compileToCanvasDef, validateSpec, slugify, type BuilderSpec } from "@/lib/moduleBuilder";

export const CUSTOM_PREFIX = "custom:";

export type CustomModuleRow = {
  slug: string; exercise: string; name: string; super_type: string;
  spec: BuilderSpec; org_id: string | null; status: string; author_id: string | null;
};

// Resolve any exercise key to a CanvasDef the given user is allowed to run.
// Built-ins pass straight through; custom modules are visibility-checked.
export async function resolveCanvasDefForUser(exercise: string, userId: string | null): Promise<CanvasDef | null> {
  const builtin = canvasByExercise(exercise);
  if (builtin) return builtin;
  if (!exercise.startsWith(CUSTOM_PREFIX)) return null;

  let admin;
  try { admin = createAdminClient(); } catch { return null; }
  const { data: row } = await admin.from("custom_modules").select("*").eq("exercise", exercise).maybeSingle();
  if (!row) return null;

  const orgId = (row as any).org_id as string | null;
  const isAuthor = !!userId && (row as any).author_id === userId;

  // Org modules are visible only to members of that org (or the author).
  if (orgId && !isAuthor) {
    if (!userId) return null;
    const { data: mem } = await admin.from("org_members").select("user_id").eq("org_id", orgId).eq("user_id", userId).maybeSingle();
    if (!mem) return null;
  }
  // Drafts run only for their author.
  if ((row as any).status !== "published" && !isAuthor) return null;

  // Branding: an org module carries its org's name + logo.
  let brand: { label: string; logoUrl?: string | null } | undefined;
  if (orgId) {
    const { data: org } = await admin.from("organizations").select("name, logo_url").eq("id", orgId).maybeSingle();
    if (org) brand = { label: (org as any).name, logoUrl: (org as any).logo_url };
  }

  const slug = exercise.slice(CUSTOM_PREFIX.length);
  return compileToCanvasDef((row as any).spec as BuilderSpec, { slug, exercise, brand });
}

// A custom module by slug (for /start), visibility-checked for the user.
export async function loadRunnableBySlug(slug: string, userId: string | null): Promise<{ exercise: string; orgId: string | null } | null> {
  let admin;
  try { admin = createAdminClient(); } catch { return null; }
  const { data: row } = await admin.from("custom_modules").select("exercise, org_id, status, author_id").eq("slug", slug).maybeSingle();
  if (!row) return null;
  const orgId = (row as any).org_id as string | null;
  const isAuthor = !!userId && (row as any).author_id === userId;
  if (orgId && !isAuthor) {
    if (!userId) return null;
    const { data: mem } = await admin.from("org_members").select("user_id").eq("org_id", orgId).eq("user_id", userId).maybeSingle();
    if (!mem) return null;
  }
  if ((row as any).status !== "published" && !isAuthor) return null;
  return { exercise: (row as any).exercise, orgId };
}

// Modules a user may SEE in a catalog: global published + their orgs' published,
// plus anything they authored (so drafts show for editing).
export async function listCustomModulesForUser(userId: string): Promise<CustomModuleRow[]> {
  let admin;
  try { admin = createAdminClient(); } catch { return []; }
  const orgIds = (await getMyOrgs(userId).catch(() => [])).map((m) => m.org.id);
  const { data } = await admin.from("custom_modules").select("slug, exercise, name, super_type, spec, org_id, status, author_id");
  return ((data || []) as any[]).filter((r) => {
    const visible = r.status === "published" && (r.org_id === null || orgIds.includes(r.org_id));
    return visible || r.author_id === userId;
  });
}

// Every custom module in the system, UNSCOPED — no visibility filter. Platform
// superadmin oversight only; callers must gate on isSuperadmin first.
export type CustomModuleAdminRow = {
  slug: string; exercise: string; name: string; super_type: string;
  org_id: string | null; status: string; author_id: string | null; updated_at: string | null;
};
export async function listAllCustomModules(): Promise<CustomModuleAdminRow[]> {
  let admin;
  try { admin = createAdminClient(); } catch { return []; }
  const { data } = await admin
    .from("custom_modules")
    .select("slug, exercise, name, super_type, org_id, status, author_id, updated_at")
    .order("updated_at", { ascending: false });
  return ((data || []) as any[]) as CustomModuleAdminRow[];
}

// Published interview modules an instructor can assign to a class (card meta).
export type InterviewCatalogEntry = { slug: string; name: string; emoji: string };
export async function listAssignableInterviewModules(userId: string): Promise<InterviewCatalogEntry[]> {
  const rows = await listCustomModulesForUser(userId);
  return rows
    // paper-explainer resolves via its own catalog (lib/moduleCatalog), not the interview list.
    .filter((r) => r.status === "published" && r.super_type !== "paper-explainer")
    .map((r) => ({ slug: r.slug, name: r.name || r.slug, emoji: (r.spec as any)?.emoji || "🧩" }));
}

// Resolve specific assigned slugs to card meta (published only), for a learner
// who may not otherwise see them in a catalog. Keyed by slug.
export async function interviewMetaBySlugs(slugs: string[]): Promise<Record<string, InterviewCatalogEntry>> {
  if (!slugs.length) return {};
  let admin;
  try { admin = createAdminClient(); } catch { return {}; }
  const { data } = await admin.from("custom_modules").select("slug, name, spec, status, super_type").in("slug", slugs).eq("status", "published");
  const out: Record<string, InterviewCatalogEntry> = {};
  // paper-explainer resolves via its own catalog (lib/moduleCatalog), not here.
  for (const r of ((data || []) as any[])) { if (r.super_type === "paper-explainer") continue; out[r.slug] = { slug: r.slug, name: r.name || r.slug, emoji: (r.spec as any)?.emoji || "🧩" }; }
  return out;
}

export async function listAuthoredBy(userId: string): Promise<CustomModuleRow[]> {
  let admin;
  try { admin = createAdminClient(); } catch { return []; }
  const { data } = await admin.from("custom_modules").select("slug, exercise, name, super_type, spec, org_id, status, author_id").eq("author_id", userId).order("updated_at", { ascending: false });
  return (data || []) as any[];
}

export async function getModuleForEdit(slug: string, userId: string): Promise<CustomModuleRow | null> {
  let admin;
  try { admin = createAdminClient(); } catch { return null; }
  const { data } = await admin.from("custom_modules").select("slug, exercise, name, super_type, spec, org_id, status, author_id, attributed_to").eq("slug", slug).maybeSingle();
  if (!data || (data as any).author_id !== userId) return null; // only the author edits
  return data as any;
}

async function uniqueSlug(admin: any, base: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const cand = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await admin.from("custom_modules").select("slug").eq("slug", cand).maybeSingle();
    if (!data) return cand;
  }
  return `${base}-${Math.floor(Date.now() % 100000)}`;
}

// Create or update. Authorization (who may author, and which org) is decided by
// the calling route; this trusts the resolved orgId. Returns the runnable slug.
// Decide who a module is credited to, and whether that credit is live. The
// operator is always the owner (author_id). An attributed person who IS a current
// member of the module's org is trusted immediately ('active', they can disavow);
// anyone else needs to accept ('pending'). Self-attribution is always active.
async function resolveAttribution(
  operatorId: string, orgId: string | null, attributedTo: string | null | undefined,
): Promise<{ attributed_to: string; attribution_status: "active" | "pending" }> {
  const who = attributedTo && attributedTo !== operatorId ? attributedTo : operatorId;
  if (who === operatorId) return { attributed_to: operatorId, attribution_status: "active" };
  const trusted = !!orgId && (await isOrgMember(orgId, who));
  return { attributed_to: who, attribution_status: trusted ? "active" : "pending" };
}

export async function saveCustomModule(input: {
  userId: string; spec: BuilderSpec; orgId: string | null; status?: "draft" | "published"; editSlug?: string; attributedTo?: string | null;
}): Promise<{ slug: string; exercise: string } | { error: string }> {
  const errs = validateSpec(input.spec);
  if (errs.length) return { error: errs[0] };

  let admin;
  try { admin = createAdminClient(); } catch { return { error: "Storage is not configured." }; }

  const base = moduleBySlug(slugify(input.spec.name)) ? `c-${slugify(input.spec.name)}` : slugify(input.spec.name);

  if (input.editSlug) {
    const { data: existing } = await admin.from("custom_modules").select("author_id, exercise, attributed_to, attribution_status").eq("slug", input.editSlug).maybeSingle();
    if (!existing || (existing as any).author_id !== input.userId) return { error: "Not found or not yours to edit." };
    // Preserve the credited person's own choice (accept/disavow) when the target is
    // unchanged; only recompute status when the operator points it at someone new.
    const prevWho = (existing as any).attributed_to || input.userId;
    const nextWho = input.attributedTo && input.attributedTo !== input.userId ? input.attributedTo : input.userId;
    let attributed_to = prevWho, attribution_status = (existing as any).attribution_status || "active";
    if (nextWho !== prevWho) {
      const a = await resolveAttribution(input.userId, input.orgId, input.attributedTo);
      attributed_to = a.attributed_to; attribution_status = a.attribution_status;
    }
    const { error } = await admin.from("custom_modules").update({
      name: (input.spec.name || "").slice(0, 80), super_type: input.spec.superType, spec: input.spec,
      org_id: input.orgId, status: input.status || "published", attributed_to, attribution_status,
      updated_at: new Date().toISOString(),
    }).eq("slug", input.editSlug);
    if (error) return { error: error.message };
    return { slug: input.editSlug, exercise: (existing as any).exercise };
  }

  const slug = await uniqueSlug(admin, base);
  const exercise = CUSTOM_PREFIX + slug;
  const attr = await resolveAttribution(input.userId, input.orgId, input.attributedTo);
  const { error } = await admin.from("custom_modules").insert({
    slug, exercise, name: (input.spec.name || "").slice(0, 80), super_type: input.spec.superType,
    spec: input.spec, org_id: input.orgId, status: input.status || "published", author_id: input.userId,
    attributed_to: attr.attributed_to, attribution_status: attr.attribution_status,
  });
  if (error) return { error: error.message };
  return { slug, exercise };
}
