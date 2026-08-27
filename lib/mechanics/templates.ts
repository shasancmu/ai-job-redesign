// The template gallery source of truth. Every "create" starts from one of these,
// not a blank file. Each template is a full ModuleSpec plus the card metadata the
// gallery shows. The two authored ones double as the runnable built-in references.
import type { ModuleSpec } from "@/lib/mechanics/roleplay";
import { earningsToSpec, referenceCheckSpec } from "@/lib/mechanics/seed";

// A structurally-complete blank, so the form and preview are never empty.
export const BLANK: ModuleSpec = {
  schemaVersion: 1, slug: "", mechanic: "roleplay",
  meta: { name: "New module", tagline: "", emoji: "🎭", audience: "", minutes: 20, partner: "ai" },
  objective: { goal: "", aha: "" }, world: "",
  roles: [
    { key: "char", kind: "character", name: "", model: "main", knowsScenario: true, persona: "", behavior: "You never state a falsehood. A fact that is true and favorable you affirm specifically. A fact that is true but unfavorable you never deny, but you soften it, decline to quantify the damaging specific, and pivot. You cannot affirm something that is not true this time; you decline or go non-committal instead." },
    { key: "examiner", kind: "examiner", name: "Examiner", model: "fast", knowsScenario: true },
  ],
  probes: [], scenarios: [], selection: { mode: "deterministic" },
  flow: [
    { key: "brief", kind: "brief", title: "The brief", minutes: 4, intro: "" },
    { key: "talk", kind: "converse", title: "The conversation", minutes: 12, with: "char", budget: 7, aiOpens: false },
    { key: "verdict", kind: "verdict", title: "Your call", minutes: 3, verdict: [{ key: "call", label: "Your call", type: "choice", options: [] }, { key: "confidence", label: "Confidence", type: "scale" }, { key: "flip", label: "What would change your mind", type: "text" }] },
    { key: "report", kind: "report", title: "How you did", minutes: 3 },
  ],
  rubric: { gradedBy: "examiner", instructions: "Grade the quality of the learner's questions and the calibration of their verdict, not whether they guessed the label.", output: [{ key: "score", label: "Score", type: "score", range: [0, 100] }, { key: "verdict_correct", label: "Right call", type: "bool" }, { key: "questions", label: "Your questions, scored", type: "list", of: "{ text, value: high|med|low|none, note }" }, { key: "info_map", label: "The information map", type: "list", of: "{ probe, value, asked: true|false }" }, { key: "the_tell", label: "The tell", type: "text" }, { key: "principle", label: "Principle", type: "text" }] },
  report: [{ type: "verdictLine", source: "score" }, { type: "trail", source: "questions", title: "Your questions, scored" }, { type: "map", source: "info_map", title: "The information map" }, { type: "section", source: "the_tell", title: "The tell" }, { type: "principle", source: "principle" }],
  guardrails: { language: "en", neverReveal: ["the active scenario", "the hidden narrative"], immutable: ["the character never states a falsehood", "the active scenario is fixed for the session and never revealed", "the character has no tools or data access"], safety: "fictional entities only" },
};

export type RoleplayTemplate = {
  id: string;
  name: string;
  emoji: string;
  domain: string;
  whenToUse: string;
  runnable: boolean; // has a built-in spec, so Preview works before saving
  make: () => ModuleSpec;
};

export const ROLEPLAY_TEMPLATES: RoleplayTemplate[] = [
  {
    id: "blank", name: "Blank role-play", emoji: "🎭", domain: "Start from scratch",
    whenToUse: "You know the situation and want to build it yourself, with the Copilot's help.",
    runnable: false, make: () => ({ ...BLANK }),
  },
  {
    id: "earnings-call", name: "The Earnings Call", emoji: "📊", domain: "Finance · forensic analysis",
    whenToUse: "Learners interrogate someone who won't lie but will spin, and must judge under uncertainty. The canonical example.",
    runnable: true, make: earningsToSpec,
  },
  {
    id: "reference-check", name: "The Reference Check", emoji: "📞", domain: "Hiring · eliciting signal",
    whenToUse: "A guarded, constrained source. The information is in what they won't say. Great for managers and recruiters.",
    runnable: true, make: referenceCheckSpec,
  },
];

export function roleplayTemplate(id: string): RoleplayTemplate | undefined {
  return ROLEPLAY_TEMPLATES.find((t) => t.id === id);
}

// Seed a NEW module from a template: keep the content, clear the slug so the
// author names their own (and never overwrites the built-in reference).
export function seedFromTemplate(id: string): ModuleSpec {
  const t = roleplayTemplate(id);
  const spec = t ? t.make() : { ...BLANK };
  return { ...spec, slug: "" };
}
