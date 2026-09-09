// DB-backed Paper Explainers live in the existing `custom_modules` table with
// super_type "paper-explainer" and the PxGenome stored in `spec` — the same
// storage + visibility model as living cases, so they list alongside other
// modules and route through /start without a new table.

import { createAdminClient } from "@/lib/supabase/admin";
import { getMyOrgs } from "@/lib/orgs";
import type { PxGenome } from "./types";

export const PAPER_EXPLAINER_TYPE = "paper-explainer";

// Load a saved explainer by slug, enforcing the same visibility as other custom
// modules: published + (global OR an org you belong to), or you are the author.
export async function loadPaperx(slug: string, userId: string | null): Promise<PxGenome | null> {
  let admin;
  try { admin = createAdminClient(); } catch { return null; }
  const { data: row } = await admin.from("custom_modules").select("spec, org_id, status, author_id, super_type").eq("slug", slug).eq("super_type", PAPER_EXPLAINER_TYPE).maybeSingle();
  if (!row) return null;
  const isAuthor = userId && (row as any).author_id === userId;
  const published = (row as any).status === "published";
  const orgId = (row as any).org_id as string | null;
  if (!isAuthor) {
    if (!published) return null;
    if (orgId) {
      if (!userId) return null;
      const mine = (await getMyOrgs(userId).catch(() => [])).map((m) => m.org.id);
      if (!mine.includes(orgId)) return null;
    }
  }
  const genome = (row as any).spec as PxGenome;
  return genome && genome.idea ? { ...genome, slug } : null;
}

// The author of a DB-backed explainer (null if not found).
export async function paperxAuthorId(slug: string): Promise<string | null> {
  let admin;
  try { admin = createAdminClient(); } catch { return null; }
  const { data } = await admin.from("custom_modules").select("author_id").eq("slug", slug).eq("super_type", PAPER_EXPLAINER_TYPE).maybeSingle();
  return ((data as any)?.author_id as string) || null;
}

// Published explainers among a set of slugs — for resolving cohort assignments
// on the learner dashboard. Keyed by slug.
export async function paperxMetaBySlugs(slugs: string[]): Promise<Record<string, { name: string }>> {
  const out: Record<string, { name: string }> = {};
  if (!slugs.length) return out;
  let admin;
  try { admin = createAdminClient(); } catch { return out; }
  const { data } = await admin.from("custom_modules").select("slug, name").eq("super_type", PAPER_EXPLAINER_TYPE).eq("status", "published").in("slug", slugs);
  for (const r of ((data || []) as any[])) out[r.slug] = { name: r.name || r.slug };
  return out;
}

// Published explainers as assignable-catalog entries (all, or one author's), for
// the class picker + dashboard resolution via lib/moduleCatalog.
export async function listPaperxCatalog(ownerId?: string): Promise<{ slug: string; name: string; emoji: string }[]> {
  let admin;
  try { admin = createAdminClient(); } catch { return []; }
  let q = admin.from("custom_modules").select("slug, name, spec, author_id").eq("super_type", PAPER_EXPLAINER_TYPE).eq("status", "published");
  if (ownerId) q = q.eq("author_id", ownerId);
  const { data } = await q;
  return ((data || []) as any[]).map((r) => ({ slug: r.slug, name: r.name || r.slug, emoji: (r.spec as any)?.emoji || "💡" }));
}

export type PaperxListing = { slug: string; name: string; status: string; updated_at: string | null };

// Every explainer the given user authored, newest first — for the "My explainers" list.
export async function listMyPaperx(userId: string): Promise<PaperxListing[]> {
  let admin;
  try { admin = createAdminClient(); } catch { return []; }
  const { data } = await admin
    .from("custom_modules")
    .select("slug, name, status, updated_at")
    .eq("super_type", PAPER_EXPLAINER_TYPE)
    .eq("author_id", userId)
    .order("updated_at", { ascending: false });
  return ((data || []) as any[]) as PaperxListing[];
}
