import { createAdminClient } from "@/lib/supabase/admin";
import type { ModuleSpec, Role } from "@/lib/mechanics/roleplay";
import { BUILTIN_SPECS } from "@/lib/mechanics/seed";

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
