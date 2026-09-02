// One place to find everything you've built in the studio, across every module
// type — so you don't have to remember which kind a module was to get back to
// it. Reads each engine's spec table (deduped to the latest version per slug),
// scoped to the author, with an edit link and a preview link.

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

// Each authored engine: its table, how to label it, and where its edit/run pages live.
const SPEC_TABLES: { table: string; kind: string; label: string; emoji: string; edit: string; run: string }[] = [
  { table: "explainer_specs", kind: "explainer", label: "Explainer", emoji: "📖", edit: "/studio/explainer/", run: "/e/" },
  { table: "module_specs", kind: "roleplay", label: "Role-play", emoji: "🎭", edit: "/studio/roleplay/", run: "/m/" },
  { table: "negotiation_specs", kind: "negotiation", label: "Negotiation", emoji: "🤝", edit: "/studio/negotiation/", run: "/n/" },
  { table: "benchmark_specs", kind: "benchmark", label: "Quiz", emoji: "⏱️", edit: "/studio/benchmark/", run: "/b/" },
  { table: "analytical_specs", kind: "analytical", label: "Analytical", emoji: "📊", edit: "/studio/analytical/", run: "/x/" },
  { table: "redesign_specs", kind: "redesign", label: "Redesign", emoji: "🔧", edit: "/studio/redesign/", run: "/rd/" },
  { table: "newsframe_specs", kind: "newsframe", label: "In the News", emoji: "🗞️", edit: "/studio/news/", run: "/nf/" },
];

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

  // Guided-interview modules live in custom_modules (author_id, no run prefix).
  try {
    const { data } = await db.from("custom_modules").select("slug, name, spec, status, updated_at").eq("author_id", userId).order("updated_at", { ascending: false }).limit(300);
    const seen = new Set<string>();
    for (const r of ((data as any[]) || [])) {
      if (seen.has(r.slug)) continue;
      seen.add(r.slug);
      out.push({
        slug: r.slug, name: r.name || r.spec?.name || r.slug, emoji: r.spec?.emoji || "🗂️",
        kind: "interview", kindLabel: "Guided interview", status: r.status || "draft", updatedAt: r.updated_at || null,
        editHref: `/build/${r.slug}`, runHref: null,
      });
    }
  } catch { /* skip */ }

  out.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return out;
}
