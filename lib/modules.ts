// ============================================================================
// Module registry — the heart of the platform. Add a module over time by
// adding an entry here (+ its render engine + an optional Stripe price env).
// `exercise` maps a module to its runtime engine (Room / WorkflowRoom / SoloRoom).
// ============================================================================

export type ModuleDef = {
  slug: string; // stable id used in entitlements + URLs, e.g. "reimagine-job"
  exercise: "job" | "workflow" | "solo" | "benchmark" | "network"; // which room engine renders it
  name: string;
  tagline: string;
  description: string;
  mode: string; // human-readable: "Paired", "Shared canvas", "Solo + AI"
  minutes: number;
  ai: boolean;
  emoji: string;
  priceCents: number; // display price (Stripe is source of truth for charging)
  priceEnv: string; // env var holding this module's Stripe price id
  forSale?: boolean; // false = free, instructor-run, hidden from the sales page
  instructorTool?: boolean; // shown with an "instructor tool" tag
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
    slug: "benchmark",
    exercise: "benchmark",
    name: "The Benchmark",
    tagline: "Test yourself against the machine — then see the room.",
    description:
      "A timed set of reasoning questions. Take it, get your score, and watch a live histogram of how the whole room did — next to how AI does the same test.",
    mode: "Timed",
    minutes: 10,
    ai: false,
    emoji: "⏱️",
    priceCents: 0,
    priceEnv: "STRIPE_PRICE_BENCHMARK",
    forSale: false,
    instructorTool: true,
  },
  {
    slug: "network",
    exercise: "network",
    name: "The Network",
    tagline: "Map the room's real network — live, and anonymous.",
    description:
      "Everyone names who they go to for advice and who they call a friend. Watch the advice and friendship networks draw themselves live — then reveal who's most central.",
    mode: "Live survey",
    minutes: 8,
    ai: false,
    emoji: "🕸️",
    priceCents: 0,
    priceEnv: "STRIPE_PRICE_NETWORK",
    forSale: false,
    instructorTool: true,
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

// Modules sold on the public marketing page (excludes free instructor tools).
export const SALEABLE_MODULES = MODULES.filter((m) => m.forSale !== false);

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
