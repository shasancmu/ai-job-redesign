import { createAdminClient } from "@/lib/supabase/admin";
import type { ModuleSpec, Role } from "@/lib/mechanics/roleplay";
import { BUILTIN_SPECS } from "@/lib/mechanics/seed";
import { MODULES } from "@/lib/modules";

// Load the full spec (with hidden answer keys) — server only. Prefers a stored,
// published spec; falls back to the built-in reference specs.
export async function getSpec(slug: string): Promise<ModuleSpec | null> {
  const s = String(slug || "").toLowerCase();
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("module_specs")
      .select("spec")
      .eq("slug", s)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.spec) return data.spec as ModuleSpec;
  } catch { /* table missing or RLS — fall through to builtins */ }
  if (BUILTIN_SPECS[s]) return BUILTIN_SPECS[s]();
  return null;
}

// The published, author-created role-play modules that can be assigned to a
// class. Builtins are excluded (they're templates), and any slug that collides
// with a static registry module is excluded so the two run paths never clash.
export type RoleplayCatalogEntry = { slug: string; name: string; emoji: string; minutes: number; tagline: string };

export async function listRoleplayCatalog(ownerId?: string): Promise<RoleplayCatalogEntry[]> {
  const staticSlugs = new Set(MODULES.map((m) => m.slug));
  const out: RoleplayCatalogEntry[] = [];
  const seen = new Set<string>();
  try {
    const admin = createAdminClient();
    let q = admin.from("module_specs").select("slug, spec, status, owner_id").eq("status", "published").order("updated_at", { ascending: false });
    if (ownerId) q = q.eq("owner_id", ownerId);
    const { data } = await q;
    for (const r of (data as any[]) || []) {
      if (seen.has(r.slug) || staticSlugs.has(r.slug)) continue;
      seen.add(r.slug);
      const m = r.spec?.meta || {};
      out.push({ slug: r.slug, name: m.name || r.slug, emoji: m.emoji || "🎭", minutes: m.minutes || 20, tagline: m.tagline || "" });
    }
  } catch { /* table missing */ }
  return out;
}

export async function roleplayCatalogMap(): Promise<Record<string, RoleplayCatalogEntry>> {
  const list = await listRoleplayCatalog();
  return Object.fromEntries(list.map((e) => [e.slug, e]));
}

export function characterRole(spec: ModuleSpec): Role | undefined {
  return spec.roles.find((r) => r.kind === "character" || r.kind === "interviewer");
}

// The client-safe view of a spec: NO scenarios (hidden truth / answer keys) and
// NO role behavior/persona. Only what the learner may see.
export function publicSpec(spec: ModuleSpec) {
  return {
    slug: spec.slug,
    mechanic: spec.mechanic,
    meta: spec.meta,
    objective: spec.objective,
    world: spec.world,
    flow: (spec.flow || []).map((p) => ({ key: p.key, title: p.title, minutes: p.minutes, kind: p.kind, intro: p.intro, budget: p.budget, aiOpens: p.aiOpens, verdict: p.verdict })),
    report: spec.report,
    character: (() => { const r = characterRole(spec); return r ? { key: r.key, name: r.name } : null; })(),
  };
}

export type PublicSpec = ReturnType<typeof publicSpec>;
