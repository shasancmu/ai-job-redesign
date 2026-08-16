// ============================================================================
// Module registry — the heart of the platform. Add a module over time by
// adding an entry here (+ its render engine + an optional Stripe price env).
// `exercise` maps a module to its runtime engine (Room / WorkflowRoom / SoloRoom).
// ============================================================================

export type ModuleDef = {
  slug: string; // stable id used in entitlements + URLs, e.g. "reimagine-job"
  exercise: "job" | "workflow" | "solo"; // which room engine renders it
  name: string;
  tagline: string;
  description: string;
  mode: string; // human-readable: "Paired", "Shared canvas", "Solo + AI"
  minutes: number;
  ai: boolean;
  emoji: string;
  priceCents: number; // display price (Stripe is source of truth for charging)
  priceEnv: string; // env var holding this module's Stripe price id
};

export const MODULES: ModuleDef[] = [
  {
    slug: "reimagine-job",
    exercise: "job",
    name: "Reimagine Your Job",
    tagline: "Redesign a partner's job around what only a human can do.",
    description:
      "You and a partner interview each other, then redesign each other's jobs with the 2×4 model — what AI can Search, Structure, Think, and Translate, and what only you can Lead, Own, Judge, and Integrate.",
    mode: "Paired",
    minutes: 30,
    ai: false,
    emoji: "🧭",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_JOB",
  },
  {
    slug: "reimagine-workflow",
    exercise: "workflow",
    name: "Reimagine a Workflow",
    tagline: "Rethink a workflow — don't patch it.",
    description:
      "Pick a workflow worth redesigning and weigh AI's three pulls — more vs. better, accuracy vs. generality, chaos vs. architect — then redraw it with AI and humans in the right seats.",
    mode: "Shared canvas",
    minutes: 30,
    ai: false,
    emoji: "🔧",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_WORKFLOW",
  },
  {
    slug: "solo-ai",
    exercise: "solo",
    name: "Solo with an AI Partner",
    tagline: "Lean into the human part of your job.",
    description:
      "No partner needed. An AI interviews you to find your real job, then drafts a redesign that hands AI the busywork and keeps the judgment with you.",
    mode: "Solo + AI",
    minutes: 18,
    ai: true,
    emoji: "✨",
    priceCents: 500,
    priceEnv: "STRIPE_PRICE_SOLO",
  },
];

// The all-access bundle uses the existing single price env for backward compat.
export const ALL_ACCESS = {
  slug: "all",
  name: "All modules",
  priceCents: 2900,
  priceEnv: "STRIPE_PRICE_ID",
};

export function moduleBySlug(slug: string): ModuleDef | undefined {
  return MODULES.find((m) => m.slug === slug);
}
export function moduleByExercise(exercise: string): ModuleDef | undefined {
  return MODULES.find((m) => m.exercise === exercise);
}

export function formatPrice(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

// Stripe price id for a target: a module slug, or "all" for the bundle.
// Per-module prices are optional; if unset, that module is only sold via the
// all-access bundle.
export function priceIdFor(target: string): string | undefined {
  if (target === "all") return process.env.STRIPE_PRICE_ID || undefined;
  const m = moduleBySlug(target);
  if (!m) return undefined;
  return process.env[m.priceEnv] || undefined;
}
