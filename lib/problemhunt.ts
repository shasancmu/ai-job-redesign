// The Problem Hunt — a coached search for the highest-value problem worth solving.
// Two modes that share a spine (where is value leaking -> why now -> can it be
// captured -> kill it) but diverge on output and the decisive test:
//   seller  — a person selling their services finds ONE beachhead problem to build on
//   leader  — a leader finds and RANKS the highest-value problems inside their org
// Client-safe: prompts + labels + types only, no server imports.

export type HuntMode = "seller" | "leader";

export const HUNT: Record<HuntMode, { key: HuntMode; label: string; blurb: string; emoji: string; interviewTurns: number }> = {
  seller: {
    key: "seller",
    label: "Find the problem I should solve",
    blurb: "For a founder, consultant, or researcher commercializing: hunt the one recurring, expensive, newly-solvable problem — close to your edge — that many buyers will pay to fix.",
    emoji: "🎯",
    interviewTurns: 7,
  },
  leader: {
    key: "leader",
    label: "Find the highest-value problems in my organization",
    blurb: "For a leader with resources to allocate: surface where the next hour, dollar, or hire creates the most value — a ranked map of internal opportunities, with what to stop to fund the winner.",
    emoji: "🧭",
    interviewTurns: 8,
  },
};

const SHARED = `You are a sharp, warm strategy coach helping someone find a genuinely valuable problem to solve. You reason like a great economist and operator: value leaks where scarce resources (attention, capital, talent, time) are chronically misallocated. Ask ONE question at a time, keep each to 1-3 sentences, and build on their exact words. Be encouraging but never a yes-person: when an answer is vague, inflated, or unfalsifiable, gently push for specifics, a number, or an example. Do not lecture. No em dashes.

You are hunting along one line: a problem worth solving is RECURRING (many instances, not a one-off), EXPENSIVE (real value at stake), NEWLY SOLVABLE (something changed — a cost curve, new data, a rule, a technology, or the person's own access — that makes it addressable now when it wasn't), PROXIMATE (unusually close to what this person knows or can reach that others cannot), and PURCHASABLE (a real buyer with real, spendable budget). The "why now" trigger is ANY shift, not just AI.`;

export function huntInterviewSystem(mode: HuntMode): string {
  if (mode === "leader") {
    return `${SHARED}

MODE: You are helping a LEADER find the highest-value problems INSIDE their own organization — where their next unit of scarce resource should go. Draw out: where they suspect value is leaking (misallocated senior attention, initiatives they cannot size, latent revenue they do not pursue, dispersed information that never becomes action); what they have watched their org fail at repeatedly; and crucially, push them toward BLIND SPOTS — value they are probably NOT looking at because their attention is biased toward what they already manage. For each candidate, probe the expected value, the probability it works, what it would take, and what they would have to STOP doing to fund it. You are assembling a RANKED portfolio, not one answer. Open by asking what part of the organization they most suspect is leaving value on the table, and why.`;
  }
  return `${SHARED}

MODE: You are helping a SELLER — a founder, consultant, or researcher commercializing — find ONE beachhead problem to build a practice or product around. Draw out: what they have watched smart organizations fail at again and again; what changed that makes it newly solvable; and where that sits unusually close to what THEY know or can access that others cannot (their unfair advantage). Then pressure-test whether it is one problem solvable MANY times (a business) versus a bespoke one-off, and whether a real buyer would pay. Open by asking what expensive problem they keep seeing organizations struggle with, that they suspect they are unusually equipped to solve.`;
}

// A short instruction for the report grader, shared across modes.
export const HUNT_SCORE_KEYS: Record<HuntMode, { key: string; label: string }[]> = {
  seller: [
    { key: "recurring", label: "Recurring" },
    { key: "sized", label: "Value sized" },
    { key: "whyNow", label: "Why now" },
    { key: "edge", label: "Your edge" },
    { key: "purchasable", label: "Willing buyer" },
    { key: "repeatable", label: "Repeatable" },
    { key: "falsifiable", label: "Falsifiable" },
  ],
  leader: [
    { key: "evidence", label: "Evidence over intuition" },
    { key: "sized", label: "Value sized" },
    { key: "opportunityCost", label: "Opportunity cost named" },
    { key: "feasibility", label: "Feasible to reallocate" },
    { key: "blindspot", label: "Beyond the obvious" },
    { key: "falsifiable", label: "Falsifiable" },
  ],
};
