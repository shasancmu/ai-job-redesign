// Synthetic content for the demo cohort seeder. Realistic-enough data so every
// facilitator view and visualization has something to show.

export const DEMO_NAMES = [
  "Ava Chen",
  "Marcus Bell",
  "Priya Nair",
  "Diego Santos",
  "Lena Fischer",
  "Tom Okafor",
  "Sara Kim",
  "Noah Weber",
  "Maya Patel",
  "Owen Wright",
  "Isabel Rossi",
  "Jamal Harris",
];

// The 2×4 grid for a redesigned job (spelled-out sentences, per the deck).
export function jobGrid(seed: number) {
  const variants = [
    {
      lead: ["Set the quarterly narrative the team actually rallies behind"],
      own: ["Own the customer relationship when a big deal is at risk"],
      judge: ["Judge which exceptions are worth breaking the process for"],
      integrate: ["Bring finance, product, and sales to one shared number"],
      search: ["Pull every competitor price move into a weekly digest"],
      structure: ["Turn messy call notes into a clean CRM update"],
      think: ["Draft three framings of the board deck to react to"],
      translate: ["Rewrite the same update for each audience automatically"],
    },
    {
      lead: ["Decide which two bets the roadmap is really about"],
      own: ["Hold the room in a tense cross-functional review"],
      judge: ["Call whether a risky launch is ready to ship"],
      integrate: ["Stitch research, design, and data into one story"],
      search: ["Summarize 40 user interviews into themes overnight"],
      structure: ["Auto-format release notes from the ticket log"],
      think: ["Generate first-draft PRDs to critique, not to keep"],
      translate: ["Localize the launch copy into five markets"],
    },
    {
      lead: ["Coach the team through the change nobody wanted"],
      own: ["Be the face the client trusts when it goes wrong"],
      judge: ["Weigh which vendor exception is defensible"],
      integrate: ["Align legal, ops, and sales on one commitment"],
      search: ["Assemble the compliance evidence pack automatically"],
      structure: ["Normalize invoices into the finance schema"],
      think: ["Draft scenario models to pressure-test"],
      translate: ["Turn the policy into a plain-language FAQ"],
    },
  ];
  return variants[seed % variants.length];
}

export function jobText(name: string, seed: number) {
  const roles = ["Senior Marketing Manager", "Director of Product", "Regional Operations Lead"];
  const outcomes = [
    "Pipeline that compounds because the story is sharp and the follow-through is human.",
    "Products that ship because judgment, not volume, decides what's ready.",
    "Operations people trust because someone owns the hard calls.",
  ];
  return {
    owner_job_title: roles[seed % roles.length],
    owner_job_description:
      "Responsible for the number, the narrative, and the handful of relationships that actually move it.",
    real_job: "Decide what matters, and carry the relationships and judgment that make it happen.",
    strategic_outcome: outcomes[seed % outcomes.length],
    insight: `${name.split(" ")[0]}'s edge is trust and taste — not throughput.`,
    new_job_description:
      "In the reimagined role, I focus on the judgment calls and relationships that only I can hold, while AI handles the search, structuring, and first drafts underneath me.",
    final_description:
      "I lead the narrative and own the moments that matter; AI keeps the volume off my desk so my judgment is where the leverage is.",
  };
}

export function jobPlan(name: string, seed: number) {
  const headlines = ["The Judgment-First Lead", "The Taste-Driven Director", "The Trust Operator"];
  return {
    headline: headlines[seed % headlines.length],
    summary:
      "You create value by holding the judgment, taste, and relationships the org can't automate — deciding what matters and carrying the moments that build trust. AI absorbs the search, structuring, and first drafts so your attention lands where the leverage is. Together the pair is worth more than either alone.",
    superadditive: "AI clears the volume so your judgment compounds instead of drowning.",
    allocation:
      "Spend more of your week in the rooms and relationships only you can hold; hand the digests, formatting, and first drafts to AI to reclaim roughly a day a week.",
    human: [
      { task: "Set the narrative", value: "A story the team rallies behind — for leadership and the market", excel: "Protect the time to think; say it in one sentence before ten slides" },
      { task: "Own the key relationships", value: "Trust that closes deals and survives mistakes", excel: "Show up in person for the moments that matter; delegate the rest" },
    ],
    ai: [
      { task: "Competitor digest", how: "A weekly research assistant that watches pricing and news", look: "a deep-research assistant", prompt: "Summarize this week's competitor pricing and positioning changes into five bullets with sources.", cadence: "weekly", check: "Confirm the sources before you cite them" },
      { task: "CRM cleanup", how: "An assistant that turns call notes into structured updates", look: "a notes-to-CRM tool", prompt: "Turn these call notes into a CRM update with next steps and owner.", cadence: "per-project", check: "Skim for the one detail that changes the deal" },
    ],
  };
}

export function jobFeedback(seed: number) {
  const fb = [
    { plus: "The narrative point is exactly right.", minus: "The AI CRM step feels risky for enterprise.", question: "How do you keep the human check from becoming a bottleneck?", idea: "Batch the digests into a Monday ritual." },
    { plus: "Love that judgment stays with you.", minus: "Might be too much on your plate still.", question: "What would you stop first?", idea: "Let AI draft the board framings a day earlier." },
  ];
  return fb[seed % fb.length];
}

// ----- Workflow content -----------------------------------------------------
export function workflowDoc(seed: number) {
  const kits = [
    {
      name: "Monthly board reporting",
      why: "It eats a week, and by the time it's done the numbers are stale.",
      steps: [
        "Chase each team for their numbers",
        "Reconcile the figures by hand in a spreadsheet",
        "Write the narrative around what changed",
        "Build the slides",
        "Review with the CFO and revise",
      ],
      summary:
        "AI can absorb the gathering, reconciliation, and first-draft narrative so you spend the week on the judgment calls the board actually cares about.",
      opportunities: [
        { title: "Always-current numbers", outcome: "A reconciled board pack that's never more than a day stale", how: "A pipeline that pulls each team's figures and flags mismatches for you", prep: "Wire the three source sheets once; set a Monday auto-run" },
        { title: "First-draft narrative", outcome: "A draft story of what changed, ready to sharpen in an hour", how: "An assistant that drafts the commentary from the variance table", prep: "Give it last quarter's deck as the voice to match" },
      ],
      flow: [
        { text: "Pull each team's numbers automatically", role: "ai" },
        { text: "Flag reconciliation mismatches for review", role: "ai" },
        { text: "Judge which variances matter", role: "human" },
        { text: "Draft the narrative from the variance table", role: "ai" },
        { text: "Sharpen the story and own the framing", role: "human" },
        { text: "Review with the CFO", role: "human" },
      ],
      stop_start: "stop hand-reconciling spreadsheets and start reviewing an AI-built draft.",
    },
    {
      name: "Weekly customer onboarding",
      why: "Every new customer is a scramble of copy-paste and dropped steps.",
      steps: [
        "Collect the customer's details over email",
        "Set up their accounts by hand",
        "Write a welcome plan from scratch",
        "Schedule the kickoff",
        "Follow up on missing items",
      ],
      summary:
        "AI can run the setup and chase-ups so your team spends onboarding time on the relationship, not the checklist.",
      opportunities: [
        { title: "Zero-scramble setup", outcome: "Accounts and a tailored welcome plan ready before the kickoff", how: "A template-driven assistant that fills the plan from the intake form", prep: "Turn your best onboarding into the template once" },
        { title: "Nothing dropped", outcome: "Every missing item chased automatically until closed", how: "A tracker that nudges the customer and your team on a cadence", prep: "List the required items and the reminder schedule" },
      ],
      flow: [
        { text: "Collect details via a structured intake form", role: "ai" },
        { text: "Auto-provision accounts from the form", role: "ai" },
        { text: "Draft the tailored welcome plan", role: "ai" },
        { text: "Personalize the plan and set the tone", role: "human" },
        { text: "Run the kickoff relationship", role: "human" },
        { text: "Auto-chase missing items to closed", role: "ai" },
      ],
      stop_start: "stop copy-pasting setup and start owning the kickoff conversation.",
    },
  ];
  const k = kits[seed % kits.length];
  return {
    name: k.name,
    why: k.why,
    steps: k.steps.map((t) => ({ id: rid(), text: t, role: "human" })),
    analysis: {
      summary: k.summary,
      opportunities: k.opportunities,
      flow: k.flow.map((f) => ({ id: rid(), text: f.text, role: f.role })),
      tradeoffs: {
        outcomes: { aim: "Better, not just more", why: "A sharper pack beats a faster one nobody trusts", moves: ["Reallocate the reclaimed day to the framing", "Kill the low-signal slides"], check: "If it's faster but shallower, you overshot" },
        capabilities: { aim: "Accuracy where it counts", why: "The numbers must reconcile exactly", moves: ["Ground every figure in the source system", "Human sign-off on the totals"], check: "Tie the AI totals back to source before sending" },
        control: { aim: "Structure that frees autonomy", why: "Unchecked auto-sends would put wrong numbers in front of the board", moves: ["Gate the send behind one human approval", "Log every auto-pull for audit"], check: "A human approves before anything leaves the building" },
      },
    },
    stop_start: k.stop_start,
    more: "when it's genuinely low-stakes formatting",
    better: "the board narrative and the judgment behind it",
    accuracy: "the reconciled figures — no drift",
    generality: "the boilerplate commentary",
    chaos: "auto-sending unreviewed numbers to the board",
    architect: "one human approval gate before anything ships",
  };
}

export function soloChat(name: string) {
  const first = name.split(" ")[0];
  return [
    { role: "assistant", content: "Walk me through a typical week — where does your time actually go?" },
    { role: "user", content: "Honestly, too much of it goes to pulling reports and formatting updates nobody reads closely." },
    { role: "assistant", content: "When was the last time your judgment really changed an outcome?" },
    { role: "user", content: "Last month I caught that a 'good' deal was actually a churn risk. No dashboard would've flagged it — I just knew the customer." },
    { role: "assistant", content: `So the value isn't the reporting, it's the read on people. What would you do with a day back each week, ${first}?` },
    { role: "user", content: "Spend it with the three accounts that actually decide the quarter." },
  ];
}

function rid() {
  // Non-crypto id is fine for seed content.
  return `s${Math.floor(Math.random() * 1e9).toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
}
