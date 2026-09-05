// DB-backed living cases live in the existing `custom_modules` table with
// super_type "living-case" and the CaseGenome stored in `spec`. This reuses the
// authoring storage + visibility model (org-scoped or global, drafts author-only)
// without a new table, and keeps living cases listed alongside other modules.

import { createAdminClient } from "@/lib/supabase/admin";
import { getMyOrgs } from "@/lib/orgs";
import type { CaseGenome } from "./types";

export const LIVING_CASE_TYPE = "living-case";

// Load a saved living case by slug, enforcing the same visibility as other custom
// modules: published + (global OR an org you belong to), or you are the author.
export async function loadLivingCase(slug: string, userId: string | null): Promise<CaseGenome | null> {
  let admin;
  try { admin = createAdminClient(); } catch { return null; }
  const { data: row } = await admin.from("custom_modules").select("spec, org_id, status, author_id, super_type").eq("slug", slug).eq("super_type", LIVING_CASE_TYPE).maybeSingle();
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
  const genome = (row as any).spec as CaseGenome;
  return genome && genome.situationBeats ? { ...genome, slug } : null;
}

export type LivingCaseListing = { slug: string; name: string; status: string; updated_at: string | null };

// Every living case the given user authored, newest first — for the "My cases" list.
export async function listMyLivingCases(userId: string): Promise<LivingCaseListing[]> {
  let admin;
  try { admin = createAdminClient(); } catch { return []; }
  const { data } = await admin
    .from("custom_modules")
    .select("slug, name, status, updated_at")
    .eq("super_type", LIVING_CASE_TYPE)
    .eq("author_id", userId)
    .order("updated_at", { ascending: false });
  return ((data || []) as any[]) as LivingCaseListing[];
}
