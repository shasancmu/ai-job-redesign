// Overcoming Myopia — one shared engine, two subjects (a business, a career).
// Grounded in the organizational-myopia framework: success narrows what you
// attend to (simplification + specialization → a competency trap), producing
// three compounding blind spots (spatial, temporal, failure); you sit on a
// local peak on a rugged landscape; you escape only by deliberately raising
// aspirations and designing for exploration before you need it.

import type { BottomLine } from "./advice";

export type MyopiaDomain = "business" | "career";

export const MYOPIA_DOMAINS: Record<MyopiaDomain, {
  key: MyopiaDomain;
  subject: string;        // "your business" / "your career"
  areas: string[];        // the choice-vector areas for this domain
  intakeLabel: string;
  intakePlaceholder: string;
  opener: string;         // the interviewer's opening move
}> = {
  business: {
    key: "business",
    subject: "your business",
    areas: ["Product", "Organization", "Innovation", "Marketing"],
    intakeLabel: "Your business",
    intakePlaceholder: "e.g. Maple & Oak, a neighborhood bakery doing wholesale + retail",
    opener: "Walk me through what your business does today and what it's really good at.",
  },
  career: {
    key: "career",
    subject: "your career",
    areas: ["Skills & craft", "Role & positioning", "Network & relationships", "Bets & experiments"],
    intakeLabel: "Your role and field",
    intakePlaceholder: "e.g. a product manager in fintech, about 8 years in",
    opener: "Tell me about where your career is right now and what you've become known for.",
  },
};

// The canonical framework, injected into every myopia interview and report so
// both modules reason the same rigorous way. THIS is the shared resource.
export const MYOPIA_FRAMEWORK = `Reason with the organizational-myopia framework, applied to the subject:
- ROOT CAUSE: success → simplification → specialization. Winning leads you to simplify your world and double down on specialized strengths, which quietly draws a boundary (the "myopic boundary") around what you pay attention to. Inside it sits everything near, high-probability, and close to your competencies. That comfortable inside is the COMPETENCY TRAP.
- BUNDLE OF CHOICES: the subject is a bundle of choices (a vector) across a few areas. Map the current choices in each area honestly.
- THREE COMPOUNDING BLIND SPOTS:
  1. SPATIAL ("distant places"): markets, customers, technologies, adjacent fields, or arenas outside the circle that are being ignored.
  2. TEMPORAL ("distant times"): how the world will plausibly change, and futures not being prepared for ("what if the interface becomes voice/AI? what if the premium segment shrinks?").
  3. FAILURE: avoiding bold, low-probability bets. A suspicious LACK of failures signals too little exploration and too much playing it safe.
- ASPIRATIONS vs CURRENT: you only search (explore, experiment, reinvent) when your routines fail to hit your aspirations, OR when you deliberately RAISE aspirations. The myopic move is to quietly LOWER aspirations so the gap disappears.
- RUGGED LANDSCAPE: because choices are interdependent, you sit on a LOCAL PEAK. Incremental change keeps you safe but stuck; radical change can make you worse before better. Path dependence keeps you where past success worked, which is exactly why disruption is so hard to answer.
- OVERCOMING IT (design for exploration BEFORE you need it): decentralize / modularize so parts can explore independently; run pilots and small experiments; invest in learning and R&D; engage the edges and customers; make deliberate bets OUTSIDE the boundary.`;

export type MyopiaReport = {
  bottomLine?: BottomLine;
  bundle: { summary: string; choices: { area: string; choice: string }[] };
  simplification: string;   // how success has narrowed the world
  competencyTrap: string;   // what they lean on because it's close and safe
  spatial: { blindSpot: string; examples: string[] };
  temporal: { blindSpot: string; scenarios: string[] };
  failure: { blindSpot: string; note: string };
  localOptimum: string;     // where they're stuck on a local peak
  aspiration: { current: string; aspiration: string; gap: string };
  exploration: { move: string; type: string; why: string; firstStep: string }[];
};
