// Synthetic content for the demo cohort seeder. Realistic-enough data so every
// facilitator view and visualization has something to show.
import { scenarioByExercise, type MultiScenario, type PriceScenario } from "./negotiation";

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
    insight: `${name.split(" ")[0]}'s edge is trust and taste, not throughput.`,
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
      "You create value by holding the judgment, taste, and relationships the org can't automate, deciding what matters and carrying the moments that build trust. AI absorbs the search, structuring, and first drafts so your attention lands where the leverage is. Together the pair is worth more than either alone.",
    superadditive: "AI clears the volume so your judgment compounds instead of drowning.",
    allocation:
      "Spend more of your week in the rooms and relationships only you can hold; hand the digests, formatting, and first drafts to AI to reclaim roughly a day a week.",
    human: [
      { task: "Set the narrative", value: "A story the team rallies behind, for leadership and the market", excel: "Protect the time to think; say it in one sentence before ten slides" },
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
    accuracy: "the reconciled figures, no drift",
    generality: "the boilerplate commentary",
    chaos: "auto-sending unreviewed numbers to the board",
    architect: "one human approval gate before anything ships",
  };
}

export function soloChat(name: string) {
  const first = name.split(" ")[0];
  return [
    { role: "assistant", content: "Walk me through a typical week. Where does your time actually go?" },
    { role: "user", content: "Honestly, too much of it goes to pulling reports and formatting updates nobody reads closely." },
    { role: "assistant", content: "When was the last time your judgment really changed an outcome?" },
    { role: "user", content: "Last month I caught that a 'good' deal was actually a churn risk. No dashboard would've flagged it. I just knew the customer." },
    { role: "assistant", content: `So the value isn't the reporting, it's the read on people. What would you do with a day back each week, ${first}?` },
    { role: "user", content: "Spend it with the three accounts that actually decide the quarter." },
  ];
}

function rid() {
  // Non-crypto id is fine for seed content.
  return `s${Math.floor(Math.random() * 1e9).toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
}

// ----- Negotiation ("Close the Offer") -----------------------------------
const NEG_SEEDS = [
  {
    // Strong: found the logroll + compatible wins → 100% joint, beats walk-away.
    terms: { salary: 3, bonus: 2, equity: 0, remote: 3, start: 0, title: 2 },
    chat: [
      { role: "assistant", content: "Welcome aboard-to-be! We'd love to bring you in as a Senior Analyst at $130k, 0.5% equity, two remote days, starting in a month. How does that land?" },
      { role: "user", content: "Thanks. I'm excited. I have another offer, so I need this to work. Salary matters, and honestly full-remote is the big one for me. I care less about equity. Could we trade there?" },
      { role: "assistant", content: "Equity's tight for us, so if you'll take 0.10% I can get more flexible elsewhere. But full remote is a stretch." },
      { role: "user", content: "Deal on 0.10% equity if you can do fully remote and a Manager title, and I can start in two weeks, which I know helps you. Let's land salary at $150k with a $20k signing bonus." },
      { role: "assistant", content: "Fast start and Manager we can do, and 0.10% works. I'll meet you at $150k but hold the bonus to $20k. Shake on it?" },
      { role: "user", content: "Done. Pleasure negotiating with you." },
    ],
    feedback:
      "Excellent. You created essentially all the value on the table (100% of the joint pie) and cleared your walk-away comfortably. You spotted the two trades that matter: you conceded equity, which the company guards fiercely, in exchange for full remote, which you valued most, and you didn't waste time fighting over start date or title, where you both wanted the same thing. To push further next time, open with a stronger salary anchor. You split the fixed pie evenly, and a firmer first number might have claimed more of it.",
  },
  {
    // Weak: fought the compatible issues, missed the logroll, under walk-away.
    terms: { salary: 1, bonus: 1, equity: 2, remote: 1, start: 3, title: 0 },
    chat: [
      { role: "assistant", content: "We'd love to have you: $130k, 0.5% equity, two remote days, Senior Analyst, starting in a month. Thoughts?" },
      { role: "user", content: "I'd want to start later, maybe three months, and I'm not sure about the title." },
      { role: "assistant", content: "We actually need someone soon, so a fast start helps us a lot, and Manager is easy for us to offer. Let's keep equity where it is though." },
      { role: "user", content: "Let's just keep it simple: $130k, the 0.5% equity, two days remote, Analyst title, and I'll start in three months." },
      { role: "assistant", content: "If that's what you'd like, we can do that. Welcome to the team." },
    ],
    feedback:
      "You left a lot on the table: only about half of the possible joint value, and your package came in under your walk-away, so you'd have been better off taking your other offer. Two misses drove it: you pushed for a late start and settled for Analyst even though the company was happy to give you a fast start and a Manager title (you both wanted those), and you never traded equity for remote, the one move that actually creates value here. Next time, probe which issues you truly disagree on before conceding, and always check the final package against your BATNA before you shake hands.",
  },
];

export function negSeed(i: number): any {
  const s = NEG_SEEDS[i % NEG_SEEDS.length];
  return { terms: s.terms, noDeal: false, chat: s.chat, feedback: s.feedback };
}

const HAGGLE_SEEDS = [
  {
    price: 13000,
    chat: [
      { role: "assistant", content: "She's a great van: low miles, new tires, never let me down. I've got it at $17,500 and I've had real interest." },
      { role: "user", content: "Appreciate that, but comparable vans are going for around $14–15k, and I've seen a couple with lower miles. I could do $12,800 today, cash." },
      { role: "assistant", content: "$12,800 is a bit light for what she is. I could come to $14,500." },
      { role: "user", content: "Let's split the difference toward a real number: $13,000, cash, I take it off your hands this week." },
      { role: "assistant", content: "You drive a hard bargain… okay, $13,000 and she's yours." },
    ],
    feedback:
      "Strong claiming. You anchored low but credibly with comps, stayed patient, and closed at $13,000, capturing about 86% of the bargaining zone and saving $3,000 against your walk-away. You used a cash-and-quick close as leverage, which is exactly right in a distributive deal. One refinement: your first anchor ($12,800) was close to your final price, so you had little room to concede and 'give' the seller a win. A slightly lower opener can leave room to trade small moves while still landing where you did.",
  },
  {
    price: 15500,
    chat: [
      { role: "assistant", content: "$17,500 and honestly she's worth every penny, barely broken in." },
      { role: "user", content: "That's a bit high for me. Could you do $16,000?" },
      { role: "assistant", content: "I can't go that low, she's too clean. $16,500 is as far as I'd stretch." },
      { role: "user", content: "Okay, let's meet at $15,500?" },
      { role: "assistant", content: "You know what, for a quick sale: done, $15,500." },
    ],
    feedback:
      "You left most of the money on the table: you landed at $15,500, saving only $500 against your walk-away and claiming about 14% of the gap. Two things hurt you: your first offer ($16,000) was already near your ceiling, so you anchored yourself high, and you moved toward the seller quickly without making them justify their price. Next time, open well below your target with a reason (comps, condition, cash), then concede slowly in small increments. Let the seller do the work of closing the gap.",
  },
];

export function careerSeed(): any {
  return {
    mode: "resume",
    role: "Senior Marketing Manager",
    level: "Manager",
    xray: {
      occupation: "Marketing Managers",
      occupationCode: "11-2021",
      topDownSource: "published",
      headline: "Most of the production is exposed; the strategy and relationships are not.",
      summary:
        "The routine of your role (drafting, reporting, campaign ops) is highly exposed to AI. But the parts that actually move the number (positioning, cross-functional judgment, the customer relationships) are where you're a scarce complement. The move is to hand AI the volume and reinvest the time up-market.",
      topDownExposure: 73,
      bottomUpExposure: 61,
      automateShare: 35,
      augmentShare: 40,
      humanShare: 25,
      tasks: [
        { task: "Draft campaign copy and variants", exposure: "E1", mode: "substitute", note: "LLM writes the first drafts" },
        { task: "Build the weekly performance report", exposure: "E2", mode: "substitute", note: "pulled + summarized by tools" },
        { task: "Summarize customer research into themes", exposure: "E1", mode: "complement", note: "AI clusters, you interpret" },
        { task: "Set the quarterly positioning", exposure: "E0", mode: "complement", note: "judgment + taste" },
        { task: "Align sales, product, and finance on the plan", exposure: "E0", mode: "complement", note: "relationships + trust" },
        { task: "Localize content across markets", exposure: "E2", mode: "substitute", note: "near-automatable" },
        { task: "Own the executive narrative", exposure: "E1", mode: "complement", note: "AI drafts, you decide" },
        { task: "Manage the agency relationship", exposure: "E0", mode: "complement", note: "accountability" },
      ],
      newTasks: [
        { task: "Design and supervise the marketing AI stack", why: "Someone must own the prompts, guardrails, and QA as AI takes the volume." },
        { task: "Run more, faster experiments", why: "With drafting cheap, the constraint shifts to judgment about what to test." },
        { task: "Deepen a few strategic customer relationships", why: "The scarce, compounding asset AI can't build." },
      ],
      durableValue: ["Positioning and taste", "Cross-functional trust", "Judgment on what to test and ship", "Accountability for the number"],
      careerVectors: [
        { role: "Director of Product Marketing", why: "Leans into positioning + cross-functional judgment, less on production" },
        { role: "Head of Growth", why: "Rewards the experiment-design and analytical judgment AI amplifies" },
        { role: "Founder / fractional CMO", why: "Package the judgment; let AI do the execution leverage" },
      ],
      jobSearch: {
        keywords: ["product marketing", "positioning", "GTM strategy", "growth experimentation", "AI marketing stack"],
        whereToLook: ["Series B–D startups scaling GTM", "PLG companies hiring their first PMM lead", "growth-stage marketplaces"],
        signals: ["A portfolio of positioning work", "1–2 experiments with clear lift", "evidence you built an AI-augmented workflow"],
      },
    },
  };
}

export function jdSeed(): any {
  return {
    mode: "jd",
    role: "Data Analyst",
    level: "Mid",
    xray: {
      occupation: "Data Scientists",
      occupationCode: "15-2051",
      topDownSource: "published",
      headline: "The querying and reporting are highly exposed; the framing and stakeholder judgment are the hire.",
      summary:
        "Most of this role as written (pulling data, building dashboards, writing summaries) is squarely in AI's wheelhouse. Hire for the parts that aren't: framing the right question, knowing which number to trust, and translating analysis into a decision. Rewrite the role around that.",
      topDownExposure: 65,
      bottomUpExposure: 60,
      automateShare: 40,
      augmentShare: 38,
      humanShare: 22,
      tasks: [
        { task: "Write SQL queries and pull data", exposure: "E2", mode: "substitute", note: "AI + tools do this well" },
        { task: "Build and maintain dashboards", exposure: "E2", mode: "substitute", note: "near-automatable" },
        { task: "Summarize findings into a memo", exposure: "E1", mode: "complement", note: "AI drafts, human frames" },
        { task: "Decide which question is worth answering", exposure: "E0", mode: "complement", note: "judgment" },
        { task: "Vet data quality and spot the wrong number", exposure: "E1", mode: "complement", note: "skepticism AI lacks" },
        { task: "Present to and align stakeholders", exposure: "E0", mode: "complement", note: "trust + persuasion" },
        { task: "Clean and reshape messy data", exposure: "E2", mode: "substitute", note: "tool-assisted" },
      ],
      newTasks: [
        { task: "Own the analytics AI stack + guardrails", why: "As querying automates, someone must ensure the AI's answers are trustworthy." },
        { task: "Partner as a decision consultant, not a report factory", why: "The value shifts from producing analysis to shaping decisions." },
      ],
      durableValue: ["Framing the right question", "Judgment on which numbers to trust", "Turning analysis into a decision", "Stakeholder credibility"],
      careerVectors: [
        { role: "Analytics Engineer / Decision Scientist", why: "Leans into the parts AI amplifies rather than replaces" },
        { role: "Product / Strategy Analyst", why: "Rewards framing and stakeholder judgment" },
      ],
      jobSearch: {
        keywords: ["decision scientist", "product analytics", "experimentation", "SQL + causal inference", "stakeholder-facing analyst"],
        whereToLook: ["Data teams at PLG startups", "analytics guilds and dbt community", "ex-consulting analysts moving in-house"],
        signals: ["A writeup where they framed a question, not just charts", "evidence they changed a decision", "healthy skepticism about a metric"],
      },
    },
  };
}

export function haggleSeed(i: number): any {
  const s = HAGGLE_SEEDS[i % HAGGLE_SEEDS.length];
  return { terms: { price: s.price }, noDeal: false, chat: s.chat, feedback: s.feedback };
}

// Varied (random) outcomes to give the cohort plots a realistic spread.
export function randomOfferOutcome(): any {
  const scn = scenarioByExercise("negotiation") as MultiScenario;
  const terms: Record<string, number> = {};
  for (const iss of scn.issues) terms[iss.key] = Math.floor(Math.random() * iss.options.length);
  return { terms, noDeal: false, chat: [], feedback: "" };
}
export function randomHaggleOutcome(): any {
  const scn = scenarioByExercise("haggle") as PriceScenario;
  const span = scn.yourReservation - scn.theirReservation;
  const price = Math.round((scn.theirReservation + Math.random() * (span + 600)) / 100) * 100;
  return { terms: { price }, noDeal: false, chat: [], feedback: "" };
}

// ----- Strategy-canvas content (4A / GAS / opportunity-capability / experiment) ---
const FOURA_SEEDS = [
  {
    subject: "Rolling out the new pricing model across the sales org",
    ratings: { alignment: 45, ability: 70, architecture: 35, agility: 60 },
    synthesis:
      "Your people can sell it, but the org isn't set up to land it: reps read the goal differently, and the comp plan quietly rewards the old behavior. Ability is real; architecture is fighting you.",
    verdict: "Fix the comp plan first. Architecture is what's actually blocking execution.",
    fields: {
      alignment_diag: "Leadership is aligned; front-line reps still interpret 'value pricing' as 'discount when pushed'.",
      alignment_fix: "One-page 'why this, why now' and a manager-led huddle so the goal reads the same everywhere.",
      ability_diag: "Strong sales talent and enablement; a few holdout veterans set the tone.",
      ability_fix: "Pair the holdouts with early adopters and make one a visible champion.",
      architecture_diag: "The comp plan still pays on volume, so the structure rewards the old behavior.",
      architecture_fix: "Re-weight incentives to the new model before the launch, not after.",
      agility_diag: "Weekly win/loss reviews exist but feedback is slow to change the playbook.",
      agility_fix: "Tighten the loop to a 48-hour playbook update from field signal.",
    },
  },
  {
    subject: "Standing up a data platform team",
    ratings: { alignment: 60, ability: 40, architecture: 55, agility: 50 },
    synthesis:
      "Everyone agrees it matters, but you're short the senior talent to build it and the mandate is fuzzy. Alignment is fine; ability is the gap.",
    verdict: "Hire or borrow one senior platform lead before scoping anything else.",
    fields: {
      alignment_diag: "Broad agreement it's needed; less clarity on what 'done' looks like in year one.",
      alignment_fix: "Define one flagship use case the platform must serve first.",
      ability_diag: "Capable engineers, but no one has built a platform at this scale.",
      ability_fix: "Bring in a senior platform lead; upskill around them.",
      architecture_diag: "Sits under one BU, so other teams treat it as 'not theirs'.",
      architecture_fix: "Give it a cross-BU charter and a shared roadmap.",
      agility_diag: "Roadmap is annual; the space moves faster than that.",
      agility_fix: "Move to quarterly re-planning with a kill/scale gate.",
    },
  },
  {
    subject: "Merging two regional teams after the acquisition",
    ratings: { alignment: 30, ability: 65, architecture: 50, agility: 40 },
    synthesis:
      "Talent is strong on both sides, but the two teams are pulling toward different goals and cultures. Alignment is the fault line.",
    verdict: "Name one shared goal and one operating rhythm before touching org charts.",
    fields: {
      alignment_diag: "Two playbooks, two definitions of success, quiet turf tension.",
      alignment_fix: "A joint offsite to set one goal and one scorecard.",
      ability_diag: "Deep talent on both sides; the risk is losing it to uncertainty.",
      ability_fix: "Lock in key people early with clear roles.",
      architecture_diag: "Duplicated processes and tools slow everything down.",
      architecture_fix: "Pick one stack and one process per function, fast.",
      agility_diag: "Change fatigue is making people cautious.",
      agility_fix: "Small, visible early wins to rebuild momentum.",
    },
  },
];

export function fourASeed(i: number): any {
  return FOURA_SEEDS[i % FOURA_SEEDS.length];
}

export function canvasSeed(exercise: string): any {
  if (exercise === "four-a") return fourASeed(0);
  if (exercise === "venture") {
    return {
      subject: "A subscription meal-prep service for busy families in Austin",
      synthesis:
        "The pain is real and the price point works, but this is a brutal, low-moat industry: food delivery is crowded, switching is easy, and margins leak to ingredients and drivers. It can work, but only as a tight local operation with high retention, not a land-grab.",
      verdict: "Marginal. LTV:CAC is only ~2.3×. A decent local business only if retention reaches 5+ months and CAC stays under ~$110; otherwise the economics don't close.",
      ratings: { industry: 30, advantage: 40, coherence: 60, profit_pool: 45 },
      calc: { price: 85, varCost: 60, ordersPerMonth: 4, retentionMonths: 3, cac: 130, fixedMonthly: 40000 },
      fields: {
        idea: "Weekly, chef-designed meal kits for time-pressed families in Austin; today they cobble together takeout, HelloFresh, and grocery runs.",
        five_forces: "Brutal: low entry barriers, HelloFresh/Factor and every ghost kitchen competing, buyers switch in a click, and grocers are a cheap substitute. Supplier power (ingredients, drivers) squeezes margin.",
        advantage: "Thin. 'Local & fresh' is valuable but easy to copy. The only durable edge would be a beloved local brand + tight delivery density in Austin, rare and hard to imitate only if you dominate one city first.",
        activity_system: "Wins only if the pieces reinforce: local sourcing → fresher product → higher retention → denser routes → lower delivery cost. That density flywheel is the real moat, if achieved.",
        profit_pool: "Most profit leaks to ingredients (~35%) and last-mile delivery (~20%). You capture the middle only at scale/density; nationally, platforms and drivers keep the money.",
        market: [
          { a: "TAM (US meal kits)", b: "~$12B, ~12%/yr" },
          { a: "SAM (Austin families)", b: "~$40M" },
          { a: "Realistic share, yr 3", b: "2–3% of SAM" },
        ],
        would_need_true: [
          "Average retention reaches 5+ months (LTV:CAC clears 3×).",
          "CAC stays under ~$110 as you scale past early adopters.",
          "Delivery density in Austin cuts variable cost below ~$55/order.",
          "You can hold price at $85 without discounting into a margin war.",
        ],
        risks: [
          "Churn: meal-kit fatigue kills LTV fast.",
          "A national player undercuts on price in Austin.",
          "Ingredient/driver cost inflation erases the thin margin.",
        ],
      },
    };
  }
  if (exercise === "scorecard") {
    return {
      subject: "Become the #1 self-serve product for small businesses in 18 months",
      synthesis:
        "The chain is clear: train the team on product-led growth and instrument the funnel (learning), so onboarding and activation get faster (process), so more trials succeed and stay (customer), so self-serve revenue compounds (financial).",
      verdict: "It all rides on activation: fix time-to-value first, and the customer and financial results follow.",
      fields: {
        fin_obj: "Build a self-serve revenue line that compounds without added sales headcount.",
        fin_kr: [
          { a: "Self-serve ARR", b: "$6M by month 18" },
          { a: "Net revenue retention", b: "≥ 115%" },
          { a: "CAC payback", b: "< 6 months" },
        ],
        fin_init: ["Usage-based pricing tier", "Monthly cohort revenue review"],
        cust_obj: "New customers reach value fast and stay on their own.",
        cust_kr: [
          { a: "Trial-to-paid conversion", b: "≥ 12%" },
          { a: "Time-to-first-value", b: "< 10 minutes" },
          { a: "Activation rate", b: "≥ 55%" },
        ],
        cust_init: ["Guided in-product onboarding", "Lifecycle nudges to the aha moment"],
        proc_obj: "Onboarding and support run themselves for the common cases.",
        proc_kr: [
          { a: "Setup self-served, no human", b: "80%" },
          { a: "Median first-response time", b: "< 5 minutes" },
          { a: "Support tickets per 100 users", b: "down 30%" },
        ],
        proc_init: ["Template-driven setup flow", "AI-assisted support triage"],
        learn_obj: "The team can run a product-led motion and read the funnel.",
        learn_kr: [
          { a: "Growth pod stood up", b: "by end of Q1" },
          { a: "Funnel dashboard live", b: "every team" },
          { a: "PLG experiments shipped", b: "2 / month" },
        ],
        learn_init: ["Hire a growth lead", "Instrument the activation funnel end-to-end"],
      },
    };
  }
  if (exercise === "gas") {
    return {
      subject: "Triaging inbound support tickets and drafting first replies",
      synthesis:
        "You want faster, more consistent first responses without losing the human touch on the hard cases. AI can classify, route, and draft the routine replies; your team keeps the judgment calls, the angry customers, and anything with money or risk attached.",
      verdict: "Mid-risk copilot: AI drafts the routine 70%; agents curate and own the 30% that decides loyalty.",
      frontier: { x: 45, y: 62 },
      fields: {
        strategic_outcome: "Cut first-response time from hours to minutes and free agents for the cases that actually retain customers.",
        required_accuracy: "High on routing (wrong queue is costly) and on anything touching billing; a rough draft is fine for the reply itself since a human reviews it.",
        required_generality: "Narrow: a defined set of ticket types; escalate anything it hasn't seen.",
        frontier_position: "Mid-risk copilot: AI over-produces draft replies, the agent curates. Automate only the low-stakes routing.",
        human_tasks: ["Handle escalations and at-risk accounts", "Approve any reply touching money or policy"],
        humanai_tasks: ["Review and send AI-drafted replies", "Correct mis-routed tickets so the model learns"],
        ai_tasks: ["Classify and route incoming tickets", "Draft first replies for known issue types"],
        user_simplicity: "Agents, not engineers. It must live inside the existing helpdesk with one-click send/edit.",
        distributed_complexity: "The complexity relocates to RAG plumbing over the help center, a routing model, and a QA reviewer role. It doesn't vanish.",
        risks: ["Overtrust: agents rubber-stamp a wrong draft", "A confident reply on a case it misread", "Tone-deaf reply to an upset customer"],
        complements: ["Agent judgment on angry/at-risk customers", "Clean, current help-center content", "A QA loop that catches drift"],
        deployment: "Human-in-the-loop (end-user check): off-the-shelf LLM + RAG over the help center and past tickets; no fine-tuning to start.",
      },
    };
  }
  if (exercise === "ocfit") {
    return {
      subject: "Launch a self-serve product for small businesses",
      synthesis:
        "The opportunity is real, but your organization is built for high-touch enterprise sales. Product and brand transfer well; the go-to-market motion, pricing systems, and a sales-led culture are the parts that would strain.",
      verdict: "Attractive bet, but don't run it inside the enterprise engine. It needs its own motion.",
      score: 55,
      fields: {
        tasks: "Self-serve needs onboarding, docs, and product-led growth, different work from the current solution-selling.",
        people: "Strong product talent; thin on growth marketing and lifecycle/PLG skills.",
        systems: "Billing and CRM are built for annual enterprise contracts, not low-touch monthly self-serve.",
        culture: "Sales-led, relationship-driven. A self-serve motion cuts against how people are rewarded here.",
        biggest_gap: "The go-to-market system and incentives: a PLG motion can't run on an enterprise sales engine.",
        to_build: ["A self-serve billing + onboarding stack", "A small growth team with PLG incentives", "A separate P&L so it isn't judged on enterprise metrics"],
      },
    };
  }
  // experiment
  return {
    subject: "Adding live chat will lift trial-to-paid conversion",
    synthesis:
      "You believe live chat during trial removes the friction that stalls conversion. Test it cheaply on a slice of new trials before staffing it everywhere.",
    verdict: "Run live chat on half of new trials for three weeks; ship it only if paid conversion beats control by 15%+.",
    fields: {
      hypothesis: "Offering live chat to trial users increases trial-to-paid conversion, because unanswered setup questions are what stall them.",
      condition_a: "Business as usual: email support only during trial.",
      condition_b: "Live chat widget available to trial users during business hours.",
      metric: "Trial-to-paid conversion rate within 30 days (the single decision metric).",
      design: ["Randomly assign new trials 50/50 for 3 weeks", "Keep everything else identical", "Pre-register the target lift before starting"],
      decision_rule: "Scale if B beats A by ≥15% relative; kill if no positive difference; extend if promising but noisy.",
      confounds: ["A pricing change mid-test", "Chat only reaching business-hours timezones", "Novelty effect from the launch"],
    },
  };
}
