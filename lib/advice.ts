// The shared "good advice" layer. Every advisory report leads with a BottomLine:
// the one thing that should shift a decision, in a clear hierarchy, so people
// attend to what matters. Grounded in what actually makes advice land: clarity,
// permission, normalization, subtraction, one next step, and a reframe.

export type BottomLine = {
  realQuestion: string; // the actual decision/tradeoff underneath what they said
  take: string; // the recommendation, phrased to also give permission
  reframe?: string; // an angle that shrinks the problem or makes it reversible
  cut?: string; // the option or worry to drop, so they can focus
  normalize?: string; // brief "this is common" reassurance
  nextStep: string; // one small, concrete thing to do this week
};

// Injected into report system prompts so the model optimizes for a decision
// shift, not a description.
export const ADVICE_PRINCIPLES = `MAKE THE ADVICE EARN ITS KEEP. A report is only good if it could shift a real decision that has a real payoff, not just describe the situation. Do as many of these as genuinely apply, always specific to THIS person and what they actually said, never generic:
- CLARITY: name the actual decision or tradeoff underneath everything they said, in one clean sentence. People circle their problem without landing it; naming it is a physical relief.
- PERMISSION: many already know what they want; when a choice is reasonable, say plainly that they are allowed to make it.
- NORMALIZE: when their situation is common, say so. Secret weight lifts when they learn they are not uniquely stuck.
- SUBTRACTION: remove options, do not pile on. If some paths are distractions, say "forget those, it's really A or B."
- ONE NEXT STEP: one small, almost trivially doable thing to do this week, not the whole plan. Momentum is the reward.
- REFRAME: an angle that makes the problem smaller or easier ("this is a reversible experiment, not a bet-the-farm choice").
Lead with the single most important thing and make the hierarchy obvious.`;

// The exact JSON shape to request for the BottomLine, appended to a report's
// schema so every report produces a consistent hero.
export const BOTTOM_LINE_JSON = `"bottomLine": {
    "realQuestion": "the actual decision or tradeoff underneath everything, in one clean sentence they will recognize instantly",
    "take": "your clear recommendation, phrased to also grant permission (e.g. 'You are ready to X; the reasonable move is Y')",
    "reframe": "an angle that shrinks the problem or makes it reversible, or empty string",
    "cut": "the option or worry to drop so they can focus, or empty string",
    "normalize": "a brief 'this is common, you are not uniquely stuck' line, or empty string",
    "nextStep": "one small, concrete thing to do this week"
  }`;
