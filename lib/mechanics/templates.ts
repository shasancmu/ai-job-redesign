// The template gallery source of truth. Every "create" starts from one of these,
// not a blank file. Each template is a full ModuleSpec plus the card metadata the
// gallery shows. The two authored ones double as the runnable built-in references.
import type { ModuleSpec } from "@/lib/mechanics/roleplay";
import { earningsToSpec, referenceCheckSpec } from "@/lib/mechanics/seed";
import { LIBRARY_TEMPLATES } from "@/lib/mechanics/library";

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

// Learner-chosen counterpart: the instructor authors the skill, the coaching, and how
// the counterpart behaves; the LEARNER types WHO they want to practice with. Great for
// "a difficult conversation with <someone the learner names>".
export function difficultConversationSpec(): ModuleSpec {
  return {
    schemaVersion: 1, slug: "", mechanic: "roleplay",
    meta: { name: "A difficult conversation", tagline: "Practice a hard conversation with anyone you choose", emoji: "😬", audience: "", minutes: 15, partner: "ai" },
    objective: { goal: "Practice raising and navigating a difficult conversation you're dreading", aha: "Naming the issue directly, with empathy and specifics, changes how it lands." },
    world: "",
    roles: [
      {
        key: "char", kind: "character", name: "Your counterpart", model: "main", knowsScenario: false,
        openPersona: {
          ask: "Who do you want to have this difficult conversation with?",
          placeholder: "Describe them — their role, their personality, and what makes this hard. e.g. my skip-level manager, blunt and skeptical of remote work, about my workload.",
        },
        persona: "The person the learner has chosen to have a hard conversation with.",
        behavior: "Stay fully in character as the person the learner described. React like a real human in a hard conversation — you may be guarded, defensive, emotional, dismissive, or busy, as fits who you are, but you are not a caricature and not impossible to reach. When the learner leads with genuine empathy, specifics, and respect, soften and engage; when they blame, generalize, or get aggressive, get defensive or withdraw. Never break character, never coach the learner, never narrate your feelings in the third person. Keep replies to a few natural sentences.",
      },
      { key: "examiner", kind: "examiner", name: "Coach", model: "fast", knowsScenario: false },
    ],
    probes: [],
    scenarios: [{ id: "s1", label: "The conversation", truth: "", narrative: "The learner is initiating a difficult conversation with the counterpart they chose. There is no hidden answer key — the counterpart simply reacts in character.", dimensions: [] }],
    selection: { mode: "fixed", fixedId: "s1" },
    flow: [
      { key: "brief", kind: "brief", title: "Set the scene", minutes: 3, intro: "You're about to practice a difficult conversation. Next, tell us who you want to practice with — then open the conversation just as you would in real life." },
      { key: "talk", kind: "converse", title: "The conversation", minutes: 10, with: "char", budget: 0, aiOpens: false },
      { key: "report", kind: "report", title: "How you did", minutes: 3 },
    ],
    rubric: {
      gradedBy: "examiner",
      instructions: "You are a communication coach. Grade how well the learner handled a difficult conversation with the counterpart they chose: did they name the issue clearly, lead with empathy and specifics, stay calm under pushback, listen and adjust, and move toward a constructive outcome? Reward directness paired with respect; note blame, vagueness, or avoidance. Grade the LEARNER only, never the counterpart. If they did something genuinely excellent — a line or a move most people wouldn't manage — name it specifically in 'What worked'. Real recognition when it's earned; never manufactured praise.",
      output: [
        { key: "score", label: "Score", type: "score", range: [0, 100] },
        { key: "did_well", label: "What worked", type: "text" },
        { key: "to_improve", label: "What to try next time", type: "text" },
        { key: "moment", label: "A turning point", type: "text" },
        { key: "principle", label: "Principle", type: "text" },
      ],
    },
    report: [
      { type: "verdictLine", source: "score" },
      { type: "section", source: "did_well", title: "What worked" },
      { type: "section", source: "to_improve", title: "What to try next time" },
      { type: "section", source: "moment", title: "A turning point" },
      { type: "principle", source: "principle" },
    ],
    guardrails: {
      language: "en",
      neverReveal: [],
      immutable: [
        "the counterpart stays in character as the person the learner described",
        "the counterpart never coaches the learner or breaks the fourth wall",
        "the counterpart has no tools or data access",
      ],
      safety: "Keep it realistic and constructive. No harassment, slurs, or self-harm content — if the learner's described persona or messages head there, stay professional and de-escalate.",
    },
  };
}

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
  {
    id: "difficult-conversation", name: "A difficult conversation", emoji: "😬", domain: "Communication · the learner picks who",
    whenToUse: "You set the skill and the coaching; the LEARNER types who they want to practice with. Great for feedback, boundaries, or any conversation they're dreading.",
    runnable: true, make: difficultConversationSpec,
  },
  ...LIBRARY_TEMPLATES.map((t) => ({ id: t.id, name: t.name, emoji: t.emoji, domain: t.domain, whenToUse: t.whenToUse, runnable: true, make: t.make })),
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
