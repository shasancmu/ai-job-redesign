// ============================================================================
// The Anatomy of an Idea — from Sharique Hasan's "Research, Strategy".
// An idea is a statement: IF X then Y, ESPECIALLY / EXCEPT when Z, BECAUSE R.
//   X = the main cause      Y = the outcome
//   Z = the scope condition  R = the mechanism
// It becomes a regression:  Y = b0 + b1·X + b2·Z + b3·(X·Z)
// b1 is the main effect; b3 is the interaction — usually where the idea lives.
// The mechanism (R) comes from a model, and a good mechanism predicts which
// OTHER outcomes should move if it's true (vs. a rival) — the discriminating
// test. The interaction has a shape, so we draw it.
// ============================================================================

export type InteractionStep = { key: string; title: string; minutes: number };
export const INTERACTION_STEPS: InteractionStep[] = [
  { key: "frame", title: "Frame the idea", minutes: 5 },
  { key: "reveal", title: "The mechanism, and the test", minutes: 9 },
];

export type Direction = "especially" | "except";

export type IdeaInputs = {
  y: string; // outcome
  x: string; // main cause
  z: string; // scope condition (moderator)
  direction: Direction;
  mechanism?: string; // R
  model?: string; // the model the mechanism comes from
};

export const DEFAULT_IDEA: IdeaInputs = { y: "", x: "", z: "", direction: "especially" };

export type Line = { x0: number; y0: number; x1: number; y1: number };

// Two lines in a 0..1 plot box: the effect of X on Y at LOW Z vs HIGH Z. A
// positive interaction ("especially") makes the high-Z line steeper; a negative
// one ("except") flattens it — X's effect fades when Z is present.
export function interactionLines(direction: Direction): { low: Line; high: Line } {
  if (direction === "especially") {
    return {
      low: { x0: 0, y0: 0.28, x1: 1, y1: 0.55 }, // modest slope
      high: { x0: 0, y0: 0.22, x1: 1, y1: 0.95 }, // steeper: effect amplified
    };
  }
  // "except when Z": X raises Y normally, but the effect nearly vanishes when Z.
  return {
    low: { x0: 0, y0: 0.2, x1: 1, y1: 0.9 }, // strong slope
    high: { x0: 0, y0: 0.55, x1: 1, y1: 0.62 }, // nearly flat: effect dampened
  };
}

export function ideaSentence(i: IdeaInputs): string {
  const x = i.x.trim() || "X";
  const y = i.y.trim() || "Y";
  const z = i.z.trim() || "Z";
  const word = i.direction === "especially" ? "especially" : "except";
  const base = `If ${x}, then ${y}, ${word} when ${z}`;
  return i.mechanism?.trim() ? `${base}, because ${i.mechanism.trim()}.` : `${base}.`;
}

export function ideaComplete(i: IdeaInputs): boolean {
  return !!(i.x.trim() && i.y.trim() && i.z.trim());
}
