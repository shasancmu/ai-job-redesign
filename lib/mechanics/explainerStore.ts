// Store + schema for authored explainers: a taught, guided walkthrough of a
// topic. Sections of explanation, each with optional key points and a check.
import { createAdminClient } from "@/lib/supabase/admin";

export type ExplainerSection = { title: string; body: string; key?: string[]; check?: string };
export type ExplainerSpec = {
  slug: string; name: string; emoji?: string;
  subject: string; // what it teaches
  intro: string; // the hook / why it matters
  sections: ExplainerSection[];
  takeaway?: string; // the one thing to remember
};

export async function getExplainerSpec(slug: string): Promise<ExplainerSpec | null> {
  try {
    const { data } = await createAdminClient()
      .from("explainer_specs").select("spec").eq("slug", String(slug || "").toLowerCase())
      .order("version", { ascending: false }).limit(1).maybeSingle();
    if (data?.spec) return data.spec as ExplainerSpec;
  } catch { /* table missing */ }
  return null;
}

export type ExplainerCatalogEntry = { slug: string; name: string; emoji: string };
export async function listExplainerCatalog(ownerId?: string): Promise<ExplainerCatalogEntry[]> {
  try {
    const admin = createAdminClient();
    let q = admin.from("explainer_specs").select("slug, spec, owner_id").eq("status", "published").order("updated_at", { ascending: false });
    if (ownerId) q = q.eq("owner_id", ownerId);
    const { data } = await q;
    const seen = new Set<string>(); const out: ExplainerCatalogEntry[] = [];
    for (const r of ((data as any[]) || [])) { if (seen.has(r.slug)) continue; seen.add(r.slug); out.push({ slug: r.slug, name: r.spec?.name || r.slug, emoji: r.spec?.emoji || "📖" }); }
    return out;
  } catch { return []; }
}

export function validateExplainerSpec(s: any): string[] {
  const e: string[] = [];
  if (!s || typeof s !== "object") return ["Not a valid explainer."];
  if (!s.slug || !/^[a-z0-9-]+$/.test(s.slug)) e.push("Give it a lowercase-with-dashes slug.");
  if (!s.name || s.name.length < 3) e.push("Give it a name.");
  if (!s.subject) e.push("Say what it teaches (the subject).");
  const sec = Array.isArray(s.sections) ? s.sections : [];
  if (sec.length < 2) e.push("Add at least 2 sections.");
  sec.forEach((x: any, i: number) => { if (!x.title || !x.body) e.push(`Section ${i + 1} needs a title and body.`); });
  return e;
}
