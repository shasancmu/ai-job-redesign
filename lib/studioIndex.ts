// One place to find everything you've built in the studio, across every module
// type — so you don't have to remember which kind a module was to get back to
// it. Reads each engine's spec table (deduped to the latest version per slug),
// scoped to the author, with an edit link and a preview link.
import { MODULE_KINDS, moduleKindBySuperType } from "@/lib/moduleKinds";

export type StudioModule = {
  slug: string;
  name: string;
  emoji: string;
  kind: string;
  kindLabel: string;
  status: string;
  updatedAt: string | null;
  editHref: string;
  runHref: string | null;
};

// Each authored engine: its table, how to label it, and where its edit/run pages
// live — derived from the canonical registry (every kind with a spec table).
const SPEC_TABLES: { table: string; kind: string; label: string; emoji: string; edit: string; run: string }[] =
  MODULE_KINDS
    .filter((k) => k.specTable)
    .map((k) => ({ table: k.specTable!, kind: k.id, label: k.label, emoji: k.emoji, edit: k.editBase, run: k.runBase || "" }));

// `db` is the service-role admin client; we filter to the author explicitly.
export async function listMyStudioModules(db: any, userId: string): Promise<StudioModule[]> {
  const out: StudioModule[] = [];

  await Promise.all(SPEC_TABLES.map(async (t) => {
    try {
      const { data } = await db.from(t.table).select("slug, spec, status, updated_at").eq("owner_id", userId).order("updated_at", { ascending: false }).limit(300);
      const seen = new Set<string>();
      for (const r of ((data as any[]) || [])) {
        if (seen.has(r.slug)) continue; // (slug, version) — keep the latest only
        seen.add(r.slug);
        out.push({
          slug: r.slug, name: r.spec?.name || r.slug, emoji: r.spec?.emoji || t.emoji,
          kind: t.kind, kindLabel: t.label, status: r.status || "draft", updatedAt: r.updated_at || null,
          editHref: `${t.edit}${r.slug}`, runHref: `${t.run}${r.slug}`,
        });
      }
    } catch { /* table/policy issue → just skip this type */ }
  }));

  // Modules that live in custom_modules (author_id). Most are guided interviews;
  // some carry a super_type (paper-explainer, living-case) with their own
  // editor + runner, so branch on it rather than labeling everything "interview".
  try {
    const { data } = await db.from("custom_modules").select("slug, name, spec, status, updated_at, super_type").eq("author_id", userId).order("updated_at", { ascending: false }).limit(300);
    const seen = new Set<string>();
    for (const r of ((data as any[]) || [])) {
      if (seen.has(r.slug)) continue;
      seen.add(r.slug);
      const base = { slug: r.slug, name: r.name || r.spec?.name || r.slug, status: r.status || "draft", updatedAt: r.updated_at || null };
      const kind = moduleKindBySuperType(r.super_type);
      if (kind?.superType === "paper-explainer") {
        out.push({ ...base, emoji: r.spec?.emoji || kind.emoji, kind: kind.superType, kindLabel: kind.label, editHref: `${kind.editBase}${r.slug}`, runHref: `${kind.runBase}${r.slug}` });
      } else if (kind?.superType === "living-case") {
        // Living case edits through its insights surface, not the plain editBase.
        out.push({ ...base, emoji: r.spec?.emoji || kind.emoji, kind: kind.superType, kindLabel: kind.label, editHref: `/cases/${r.slug}/insights`, runHref: `${kind.runBase}${r.slug}` });
      } else {
        out.push({ ...base, emoji: r.spec?.emoji || "🗂️", kind: "interview", kindLabel: "Guided interview", editHref: `/studio/interview/${r.slug}`, runHref: null });
      }
    }
  } catch { /* skip */ }

  out.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return out;
}
