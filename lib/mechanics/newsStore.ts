// Store + schema for "In the News" modules: apply a business framework to a
// current, real news story fetched live at runtime. Never goes stale.
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export type NewsField = { key: string; label: string; hint: string };
export type NewsFrameSpec = {
  slug: string; name: string; emoji?: string;
  topic: string; // the news query (what stories to pull)
  framework: string; // the framework name
  frameworkLogic: string; // how to apply it
  fields: NewsField[]; // the analysis dimensions the learner fills for the chosen story
  verdict?: { label: string; options: { value: string; label: string }[] };
  grading: string; // how to grade the application
};

async function getNewsSpecUncached(slug: string): Promise<NewsFrameSpec | null> {
  try {
    const { data } = await createAdminClient()
      .from("newsframe_specs").select("spec").eq("slug", String(slug || "").toLowerCase())
      .order("version", { ascending: false }).limit(1).maybeSingle();
    if (data?.spec) return data.spec as NewsFrameSpec;
  } catch { /* table missing */ }
  return null;
}

// Request-scoped memo: the page and its generateMetadata both need the spec,
// and cache() collapses that into a single query per request.
export const getNewsSpec = cache(getNewsSpecUncached);

export function publicNewsSpec(s: NewsFrameSpec): any {
  return { slug: s.slug, name: s.name, emoji: s.emoji, topic: s.topic, framework: s.framework, frameworkLogic: s.frameworkLogic, fields: s.fields, verdict: s.verdict };
}

export type NewsCatalogEntry = { slug: string; name: string; emoji: string };
export async function listNewsCatalog(ownerId?: string): Promise<NewsCatalogEntry[]> {
  try {
    const admin = createAdminClient();
    let q = admin.from("newsframe_specs").select("slug, spec, owner_id").eq("status", "published").order("updated_at", { ascending: false });
    if (ownerId) q = q.eq("owner_id", ownerId);
    const { data } = await q;
    const seen = new Set<string>(); const out: NewsCatalogEntry[] = [];
    for (const r of ((data as any[]) || [])) { if (seen.has(r.slug)) continue; seen.add(r.slug); out.push({ slug: r.slug, name: r.spec?.name || r.slug, emoji: r.spec?.emoji || "🗞️" }); }
    return out;
  } catch { return []; }
}

export function validateNewsSpec(s: any): string[] {
  const e: string[] = [];
  if (!s || typeof s !== "object") return ["Not a valid module."];
  if (!s.slug || !/^[a-z0-9-]+$/.test(s.slug)) e.push("Give it a lowercase-with-dashes slug.");
  if (!s.name || s.name.length < 3) e.push("Give it a name.");
  if (!s.topic || s.topic.length < 2) e.push("Set a news topic to pull stories from.");
  if (!s.framework) e.push("Name the framework.");
  if (!s.frameworkLogic || s.frameworkLogic.length < 10) e.push("Explain how to apply the framework.");
  const f = Array.isArray(s.fields) ? s.fields : [];
  if (f.length < 2) e.push("Add at least 2 analysis fields.");
  f.forEach((x: any, i: number) => { if (!x.key || !x.label) e.push(`Field ${i + 1} needs a key and a label.`); });
  return e;
}
