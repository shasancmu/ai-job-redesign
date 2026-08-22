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

  resume: {
    predictPrompt: "Before you see the suggestions: what do you think is the single weakest thing about your résumé right now?",
    predictPlaceholder: "Your honest guess, in a sentence.",
    walkthrough: [
      { anchor: "delta", title: "Your guess vs. the read", body: "You named what you think is weakest. See whether the analysis agrees, or points somewhere you weren't looking." },
      { anchor: "standing", title: "Where your résumé stands", body: "What it tells you: an honest read on how your current résumé lands. How it was built: from what you pasted plus what you described in the interview." },
      { anchor: "accomplishments", title: "Wins you left off", body: "What it tells you: accomplishments from your interview that belong on the page, written results-first. How it was built: the AI pulled concrete wins you mentioned but hadn't captured, in an X-Y-Z shape." },
      { anchor: "rewrites", title: "Lines to sharpen", body: "What it tells you: specific before/after rewrites. How it was built: it found vague or duty-listing lines and rewrote them around results. These are drafts to make yours, not text to paste." },
    ],
  },

  consult: {
    predictPrompt: "Before you see the analysis: what do you think is the single biggest constraint holding your business back right now?",
    predictPlaceholder: "Your honest guess, in a sentence.",
    walkthrough: [
      { anchor: "delta", title: "Your guess vs. the diagnosis", body: "You named the constraint you feel most. See whether the analysis lands in the same place, or somewhere upstream you weren't watching." },
      { anchor: "headline", title: "The bottom line", body: "What it tells you: the single most important thing to act on. How it was built: the AI traced your whole business back to where the money is really made and where it's leaking." },
      { anchor: "engine", title: "Your margin engine", body: "What it tells you: how you actually make money, and the levers that move it (sell more, price, cut cost). How it was built: from what you sell, your costs, and what your best customers pay for." },
      { anchor: "constraint", title: "The binding constraint", body: "What it tells you: the one thing limiting you most, the bottleneck to fix first. How it was built: by finding where your growth is actually capped, not where it's easiest to work." },
    ],
  },

  superpower: {
    predictPrompt: "Before you see the profile: in a few words, what do you think your superpower is, the thing you do better than most without trying?",
    predictPlaceholder: "Your honest guess.",
    walkthrough: [
      { anchor: "delta", title: "Your guess vs. the pattern", body: "You named what you think it is. See whether the through-line the AI found matches, or names something truer that you're too close to see." },
      { anchor: "headline", title: "Your superpower, named", body: "What it tells you: the pattern across your stories, in one line. How it was built: the AI looked for what repeats in the moments you described being at your best." },
      { anchor: "evidence", title: "The evidence", body: "What it tells you: the specific moments that reveal it. How it was built: drawn straight from the stories you told, which is why it should feel like you." },
    ],
  },

  vision: {
    predictPrompt: "Before you see it: in one line, what do you think the real reason this organization exists is, beyond making money?",
    predictPlaceholder: "Your honest guess.",
    walkthrough: [
      { anchor: "delta", title: "Your guess vs. the articulation", body: "You put words to your purpose. See how the drafted version compares, and where it reaches further than you did." },
      { anchor: "headline", title: "The one-liner", body: "What it tells you: your purpose in a single sentence. How it was built: the AI listened past what you sell to what first made you want to build this." },
      { anchor: "core", title: "Core values and purpose", body: "What it tells you: the enduring reasons you exist, the part that shouldn't change (Collins & Porras). How it was built: from what you said you'd never compromise, and what the world would lose without you." },
      { anchor: "future", title: "The envisioned future", body: "What it tells you: the bold, vivid future to aim at (the BHAG). How it was built: from where you said you want this to be in ten years, sharpened into something concrete." },
    ],
  },

  "personal-network": {
    predictPrompt: "Before you see the map: who do you think is the single most important person in your network right now, and are you sure?",
    predictPlaceholder: "A name and why.",
    walkthrough: [
      { anchor: "delta", title: "Your guess vs. the structure", body: "You named who feels central. Network structure often disagrees with intuition, see who actually holds your network together." },
      { anchor: "headline", title: "The read on your network", body: "What it tells you: the shape of your network and its biggest opportunity. How it was built: from the real ties you mapped, scored on who connects to whom." },
      { anchor: "metrics", title: "The structural metrics", body: "What it tells you: reach, brokerage, and where you're over- or under-connected (Granovetter, Burt). How it was built: computed from your contacts and the ties between them, not self-report." },
    ],
  },

  "career-roadmap": {
    predictPrompt: "Before you see the roadmap: what's the one next move you think you should make, and how confident are you it's the right one?",
    predictPlaceholder: "Your honest guess.",
    ratingLabel: "How sure are you about your next move?",
    walkthrough: [
      { anchor: "delta", title: "Your guess vs. the map", body: "You named the move you're leaning toward. See whether it shows up here, and what adjacent options you hadn't considered." },
      { anchor: "targets", title: "Your next moves", body: "What it tells you: realistic targets, lateral, step-up, and stretch. How it was built: from your skills and what energizes you, matched to roles that are actually adjacent to you." },
      { anchor: "plan", title: "The path to get there", body: "What it tells you: the near-term steps and the skills to build. How it was built: the gap between where you are and each target, turned into concrete moves." },
    ],
  },

  "job-redesign": {
    predictPrompt: "Before you see the redesign: which one part of your job do you think only you can do, and which could AI take off your plate?",
    predictPlaceholder: "One of each, in a sentence.",
    walkthrough: [
      { anchor: "delta", title: "Your guess vs. the redesign", body: "You drew your own line between you and AI. See where the redesign draws it, and where you were holding onto work you could hand off." },
      { anchor: "human", title: "What only you do", body: "What it tells you: the judgment, taste, and relationships where you're the point. How it was built: from where you said the real value is, not the tasks that just fill the week." },
      { anchor: "ai", title: "What AI takes on", body: "What it tells you: the work to delegate, and how to do it well. How it was built: the AI matched your busywork to what it can reliably handle, with a starter for each." },
    ],
  },

  pipeline: {
    predictPrompt: "Before you see the model: how many papers do you think you'll have to WRITE to end up with your target number published?",
    predictPlaceholder: "Your honest guess, as a number.",
    ratingLabel: "How sure are you about that number?",
    walkthrough: [
      { anchor: "delta", title: "Your guess vs. the model", body: "You named a number. Peer review is a lottery, so most people guess low. See how far the simulation lands from your instinct." },
      { anchor: "headline", title: "The reality", body: "What it tells you: the candid one-line read on your odds. How it was built: from the acceptance model plus your own inputs, not a pep talk." },
      { anchor: "odds", title: "Your odds", body: "What it tells you: acceptance at one journal, the chance a paper ever lands, and how many you must write. How it was built: a few reviewers each say yes with a probability set by your paper strength; an editor aggregates their votes; a paper cycles through journals until it lands or you kill it." },
      { anchor: "curve", title: "Papers written vs. publications", body: "What it tells you: each paper is worth a fraction of a publication, so output is a pipeline, not a bet. How it was built: your per-paper publication odds, extended across many papers." },
      { anchor: "plan", title: "Your pipeline strategy", body: "What it tells you: how many to keep in flight, how to pace starts, and when to kill a paper. How it was built: the AI read your simulated numbers and turned them into concrete moves." },
    ],
  },

  "paper-study": {
    predictPrompt: "Before you see the breakdown: in one sentence, what do you think this paper's core idea actually is?",
    predictPlaceholder: "Your honest read of the paper.",
    walkthrough: [
      { anchor: "delta", title: "Your read vs. the breakdown", body: "You named the idea as you saw it. Compare it to the deconstruction, the gap is where the paper's craft is hiding." },
      { anchor: "headline", title: "The paper, in a line", body: "What it tells you: the title and the one thing to remember about how it's built. How it was built: the AI read your text through four frameworks at once." },
      { anchor: "idea", title: "The idea", body: "What it tells you: the invisible force it makes visible, and whether it establishes a new fact or explains a known one. How it was built: by asking what unexplained thing the paper is really about." },
      { anchor: "hourglass", title: "The structure", body: "What it tells you: how the paper moves from broad motivation to a narrow finding and back out to a contribution. How it was built: by mapping the paper onto the five-beat hourglass." },
      { anchor: "points", title: "The five points", body: "What it tells you: the paper's argument as five topic sentences, one point each. How it was built: by reducing the introduction to its assertable claims." },
      { anchor: "interaction", title: "The key interaction", body: "What it tells you: where the contribution lives, read as if X1 then Y, especially or except when X2, because a mechanism. How it was built: by finding the paper's central moderation and naming the mechanism behind it." },
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
