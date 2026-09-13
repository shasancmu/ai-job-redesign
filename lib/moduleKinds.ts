// The single source of truth for "what a module kind is."
//
// Before this file, the same knowledge — which spec table a kind lives in, where
// its run page and studio editor are, its emoji/label, its copilot endpoint — was
// re-encoded in `lib/authorFormats.ts` (AUTHOR_FORMATS), `lib/studioIndex.ts`
// (SPEC_TABLES) and the `super_type` branching in `lib/customModules.ts`. Those
// copies drifted (redesign was 🔧 in one place and 🤝 in another; benchmark was
// "Quiz" vs "Timed quiz"). This registry is now canonical; those surfaces derive
// their arrays from it, so a new kind is added HERE, once.
//
// Server-safe (no client imports) so marketing pages can read counts off it.

export type ModuleKind = {
  /** Stable id — the AutoBuild/AUTHOR_FORMATS format id and the studioIndex `kind`. */
  id: string;
  label: string;
  emoji: string;
  /** Spec table for an authored engine (absent for custom_modules-backed kinds). */
  specTable?: string;
  /** custom_modules.super_type this kind maps to (absent for spec-table engines). */
  superType?: string;
  /** Run URL prefix, e.g. "/m/". Absent = no standalone run page (guided interview). */
  runBase?: string;
  /** Studio editor URL prefix. */
  editBase: string;
  /** AI copilot endpoint used by the create flow / AutoBuild. */
  copilotEndpoint?: string;
  /** Shown in the "author your own" surfaces (the old AUTHOR_FORMATS list). */
  authorable: boolean;
};

// Order here is the order the "create your own" surfaces show formats in.
export const MODULE_KINDS: ModuleKind[] = [
  { id: "explainer", label: "Explainer", emoji: "📖", specTable: "explainer_specs", runBase: "/e/", editBase: "/studio/explainer/", copilotEndpoint: "/api/mechanics/explainer-copilot", authorable: true },
  { id: "roleplay", label: "Role-play", emoji: "🎭", specTable: "module_specs", runBase: "/m/", editBase: "/studio/roleplay/", copilotEndpoint: "/api/mechanics/copilot", authorable: true },
  { id: "interview", label: "Guided interview", emoji: "🗂️", editBase: "/studio/interview/", copilotEndpoint: "/api/mechanics/interview-copilot", authorable: true },
  { id: "negotiation", label: "Negotiation", emoji: "🤝", specTable: "negotiation_specs", runBase: "/n/", editBase: "/studio/negotiation/", copilotEndpoint: "/api/mechanics/negotiation-copilot", authorable: true },
  { id: "benchmark", label: "Timed quiz", emoji: "⏱️", specTable: "benchmark_specs", runBase: "/b/", editBase: "/studio/benchmark/", copilotEndpoint: "/api/mechanics/benchmark-copilot", authorable: true },
  { id: "analytical", label: "Analytical", emoji: "📊", specTable: "analytical_specs", runBase: "/x/", editBase: "/studio/analytical/", copilotEndpoint: "/api/mechanics/analytical-copilot", authorable: true },
  { id: "redesign", label: "Paired redesign", emoji: "🔧", specTable: "redesign_specs", runBase: "/rd/", editBase: "/studio/redesign/", copilotEndpoint: "/api/mechanics/redesign-copilot", authorable: true },
  { id: "newsframe", label: "In the News", emoji: "🗞️", specTable: "newsframe_specs", runBase: "/nf/", editBase: "/studio/news/", copilotEndpoint: "/api/mechanics/newsframe-copilot", authorable: true },
  { id: "case", label: "Living Case", emoji: "🎬", superType: "living-case", runBase: "/cases/", editBase: "/cases/", copilotEndpoint: "/api/mechanics/case-copilot", authorable: true },
  // Not authorable from the format picker (created via its own upload flow), but a
  // real kind with a run page + editor, so it belongs in the registry too.
  { id: "paper-explainer", label: "Paper Explainer", emoji: "💡", superType: "paper-explainer", runBase: "/px/", editBase: "/studio/paper/", authorable: false },
];

export function moduleKindById(id: string): ModuleKind | undefined {
  return MODULE_KINDS.find((k) => k.id === id);
}

/** Look up the kind backing a custom_modules.super_type value. */
export function moduleKindBySuperType(superType: string): ModuleKind | undefined {
  return MODULE_KINDS.find((k) => k.superType === superType);
}
