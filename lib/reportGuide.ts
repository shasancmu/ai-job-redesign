// Predict-then-reveal + report walkthrough content, keyed by module. Same idea
// as lib/moduleIntros.ts: bespoke, original copy per module.
//
// - predictPrompt: what the learner commits BEFORE the report generates, so the
//   guess is uncontaminated and the gap becomes the lesson.
// - walkthrough: a guided tour of the finished report. Each step anchors to a
//   [data-guide="<anchor>"] element and says what the section tells you AND how
//   it was constructed (teaching the method, not just handing the answer).
export type WalkStep = { anchor: string; title: string; body: string };
export type ReportGuide = {
  predictPrompt: string;
  predictPlaceholder?: string;
  ratingLabel?: string; // optional 1-5 self-calibration
  walkthrough: WalkStep[];
};

const GUIDES: Record<string, ReportGuide> = {
  myopia: {
    predictPrompt: "Before you see the diagnosis: what do you think is your single biggest blind spot right now, the thing your own success might be hiding from you?",
    predictPlaceholder: "Your honest guess, in a sentence.",
    ratingLabel: "How confident are you that you already see your own blind spots?",
    walkthrough: [
      { anchor: "delta", title: "Your guess vs. the diagnosis", body: "You committed a prediction a moment ago. The distance between it and what surfaced is the real lesson. Look first at what you did not see coming." },
      { anchor: "headline", title: "The bottom line", body: "What it tells you: the one-sentence read on where you're narrowing. How it was built: the AI scanned your whole interview for the pattern of what success has trained you to stop noticing." },
      { anchor: "narrowed", title: "How success narrowed you", body: "What it tells you: the specific way winning at your current game shrank your field of view, the competency trap. How it was built: from the choices you described and the places you said things are working, which is exactly where blind spots hide." },
      { anchor: "blindspots", title: "Your three blind spots", body: "What it tells you: where you're not looking, across space (distant places and markets), time (distant futures), and risk (playing it safe). How it was built: each is inferred from what you emphasized and, just as tellingly, what you never mentioned." },
      { anchor: "plan", title: "What to do about it", body: "What it tells you: small, deliberate moves to explore past your boundary before you're forced to. How it was built: matched to your specific blind spots, not a generic checklist." },
    ],
  },
};

export function reportGuide(key?: string | null): ReportGuide | null {
  return (key && GUIDES[key]) || null;
}

// Turn a guide's walkthrough into Tour steps (selector-anchored via data-guide).
export function walkthroughSteps(guide: ReportGuide): { sel: string; title: string; body: string }[] {
  return guide.walkthrough.map((w) => ({ sel: `[data-guide="${w.anchor}"]`, title: w.title, body: w.body }));
}
