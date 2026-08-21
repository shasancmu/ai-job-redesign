// ============================================================================
// Hard-Conversation Rehearsal — practice delivering difficult news or feedback
// to an AI playing the person on the receiving end, then get coached. Grounded
// in feedback science (Situation–Behavior–Impact) and deliberate practice.
// One module, several scenarios you pick from.
// ============================================================================

export type HardConvo = {
  key: string;
  name: string;
  emoji: string;
  counterpartName: string;
  counterpartRole: string; // who the AI plays (the receiver)
  youRole: string; // who the user is
  blurb: string; // one line for the picker
  situation: string; // the setup, shown in the brief
  yourGoal: string; // what a good version looks like
  watchOut: string; // common failure modes
  opener: string; // placeholder to nudge the user's first line
};

export const CONVOS: HardConvo[] = [
  {
    key: "let-go",
    name: "Let someone go",
    emoji: "🪧",
    counterpartName: "Chris Vale",
    counterpartRole: "an employee whose role is being eliminated",
    youRole: "their manager",
    blurb: "Deliver a layoff / termination with clarity and dignity.",
    situation:
      "You have to let Chris Vale go. It's a role elimination after a reorg — not about Chris's character or effort. You need to deliver the decision plainly, treat Chris with dignity, and cover the essentials (it's final, the severance and timeline, the transition). This is one of the hardest things a manager does.",
    yourGoal: "Say the actual news early and clearly, don't negotiate a decision that's final, acknowledge Chris's reaction, and leave them with dignity and concrete next steps.",
    watchOut: "Burying the message in small talk, over-apologizing, blaming others, or reopening a decision that's already made.",
    opener: "Open the conversation with Chris…",
  },
  {
    key: "tough-feedback",
    name: "Give tough feedback",
    emoji: "🔧",
    counterpartName: "Sam Doyle",
    counterpartRole: "a talented report who's been missing deadlines",
    youRole: "their manager",
    blurb: "Name an underperformance pattern without crushing them.",
    situation:
      "Sam Doyle is smart and well-liked, but has missed several deadlines and the team is picking up the slack. You need to name the pattern specifically, hear Sam out, and land a clear expectation — without demoralizing a person you want to keep.",
    yourGoal: "Be specific with real examples (situation → behavior → impact), stay concrete instead of labeling character, listen, and agree on one clear change.",
    watchOut: "Vague generalities ('be more reliable'), softening it until the message is lost, or making it about Sam's character instead of the behavior.",
    opener: "Open the conversation with Sam…",
  },
  {
    key: "deny-promotion",
    name: "Deny a promotion",
    emoji: "⏳",
    counterpartName: "Alex Kim",
    counterpartRole: "a strong performer who expected a promotion this cycle",
    youRole: "their manager",
    blurb: "Explain a 'not yet' honestly and keep them motivated.",
    situation:
      "Alex Kim is a strong performer who fully expected to be promoted this cycle — and it didn't happen. You need to explain honestly why, keep Alex engaged rather than heading for the door, and offer a real path forward, without vague promises you can't keep.",
    yourGoal: "Be honest about the specific gap, avoid empty reassurance, acknowledge the disappointment, and give a concrete, credible path.",
    watchOut: "Hiding behind 'the committee', making promises you can't keep, or being so soft that Alex leaves thinking it was arbitrary.",
    opener: "Open the conversation with Alex…",
  },
  {
    key: "pip",
    name: "Deliver a PIP",
    emoji: "📋",
    counterpartName: "Jordan Pike",
    counterpartRole: "an employee who's been struggling",
    youRole: "their manager",
    blurb: "Put someone on a formal plan — serious, but fair.",
    situation:
      "You're placing Jordan Pike on a formal performance improvement plan. It's serious — but it's not a firing, and the point is a fair, clear plan Jordan can actually meet. You need to deliver it without ambushing them, be clear about what success looks like, and keep it humane.",
    yourGoal: "Be clear it's formal and serious, be specific about what success looks like and by when, and keep it fair and non-threatening.",
    watchOut: "Ambushing them, being so gentle they miss that it's serious, or being punitive instead of specific about the path to success.",
    opener: "Open the conversation with Jordan…",
  },
  {
    key: "push-back",
    name: "Push back on your boss",
    emoji: "🧭",
    counterpartName: "Robin Ellis",
    counterpartRole: "your boss, who wants to ship on a deadline you think is unsafe",
    youRole: "their report",
    blurb: "Disagree up without torching the relationship.",
    situation:
      "Your boss, Robin Ellis, wants to ship on a deadline you believe is genuinely unsafe — real risk to quality and customers. You need to disagree respectfully, make the case with evidence, and either move Robin or land on a workable path — without damaging the relationship or looking like you're not a team player.",
    yourGoal: "Lead with the shared goal, bring evidence, disagree on the plan not the person, and propose a concrete alternative.",
    watchOut: "Caving immediately, making it a personal fight, being vague about the risk, or having no alternative to offer.",
    opener: "Open the conversation with Robin…",
  },
];

export function convoByKey(key: string): HardConvo | undefined {
  return CONVOS.find((c) => c.key === key);
}

// The AI plays the person on the receiving end — reacting like a real human,
// pushing back in proportion to how the user handles it.
export function recipientSystem(c: HardConvo): string {
  return `You are ${c.counterpartName}, ${c.counterpartRole}. You are ON THE RECEIVING END of a hard conversation: ${c.youRole} has come to talk to you. ${c.situation}

React like a real, specific human being — you might be surprised, hurt, defensive, anxious, or push back and ask pointed questions. Crucially, respond to HOW WELL they handle it:
- If they're vague or evasive, press them for specifics ("What do you actually mean? Give me an example.").
- If they're harsh, cold, or blaming, get defensive or upset.
- If they're clear, honest, and respectful, you can engage more constructively over time — but don't just roll over; stay true to your situation and feelings.
${c.key === "push-back" ? "You outrank them, so you can be a bit dismissive at first; make them earn it with a real case and an alternative." : "This is a serious moment for you; the emotional stakes are real."}

Rules:
- Be human and specific, not a script. Keep replies short (2–4 sentences).
- Never break character, never say you're an AI, and NEVER coach or grade them.
- This is THEIR conversation to lead — react and respond, but don't take it over or resolve it for them.

Begin only after they speak first. Wait for them to open.`;
}

export const COACH_SYSTEM = `You are a seasoned executive coach debriefing someone right after they rehearsed a hard conversation against an AI playing the other person. You have the scenario and the transcript. Be specific, candid, and warm — honest, not flattering.

Judge how they did on:
1. Clarity — did they deliver the actual message plainly and early, or bury and soften it into confusion?
2. Respect & empathy — did they preserve the other person's dignity and acknowledge their reaction, without over-apologizing or caving on what's firm?
3. Structure — did they stay concrete with real examples (situation → behavior → impact) rather than vague labels about the person's character?
4. Holding the line — did they stay firm on what's non-negotiable while staying open where they could?
5. A clear next step — did they land a concrete expectation, plan, or path?

Ground everything in the transcript: quote or paraphrase specific moments. Give two things they did genuinely well and two concrete things to try next time. 6–9 sentences, no headers, second person.`;
