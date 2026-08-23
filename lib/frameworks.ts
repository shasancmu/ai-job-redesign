// The research behind each report, surfaced to the learner (progressive
// disclosure). Keyed by the report's guideKey so it renders on every
// predict-then-reveal module. Each entry: the framework, the one-line finding
// it rests on, and a citation. Kept accurate to what the AI prompts actually
// apply (see lib/ai.ts, lib/canvases.ts).

export type Framework = { name: string; finding: string; cite: string };

export const FRAMEWORKS: Record<string, Framework[]> = {
  "job-redesign": [
    { name: "Task-based view of work", finding: "Jobs are bundles of tasks; AI reshapes work task by task, not job by job.", cite: "Autor, Levy & Murnane (2003); Autor (2013)" },
    { name: "Comparative advantage", finding: "The gain from human + AI comes from each doing what it is relatively best at, not from either doing everything.", cite: "Ricardo; applied to human–AI division of labor" },
  ],
  resume: [
    { name: "Results-first (X-Y-Z) bullets", finding: "“Accomplished X, measured by Y, by doing Z” reads as impact, not duties; concrete metrics move recruiters.", cite: "Google's résumé formula; Bock, Work Rules! (2015)" },
  ],
  consult: [
    { name: "Management practices raise productivity", finding: "Stronger Operations, Monitoring, Targets and People practices independently lift productivity and margin.", cite: "Bloom, Van Reenen & Sadun; World Management Survey" },
    { name: "Profit pools", finding: "Where an industry earns its money is often not where it makes its sales (“loses on tickets, earns on popcorn”).", cite: "Gadiesh & Gilbert, HBR (1998)" },
    { name: "The 80/20 rule", finding: "A small share of customers, products, or activities usually drives most of the result.", cite: "Pareto principle" },
  ],
  superpower: [
    { name: "Reflected Best Self", finding: "Your rare strengths surface in stories of you at your best, not in self-assessment of what you're “good at.”", cite: "Roberts, Dutton, Spreitzer, Quinn & Barker (2005)" },
    { name: "Behavioral Event Interviewing", finding: "Asking for specific past episodes elicits real competencies better than asking about traits.", cite: "McClelland (1973)" },
    { name: "Resource-based view (VRIN-O)", finding: "An advantage endures when it's Valuable, Rare, Inimitable, Non-substitutable, and you're Organized to capture it.", cite: "Barney (1991)" },
  ],
  vision: [
    { name: "Core ideology vs. envisioned future", finding: "A durable vision separates the enduring core (values + purpose) from a bold, vivid future (the BHAG).", cite: "Collins & Porras, “Building Your Company's Vision,” HBR (1996)" },
  ],
  "personal-network": [
    { name: "Structural holes & brokerage", finding: "Value accrues to those who bridge otherwise-disconnected groups; constraint measures how boxed-in you are.", cite: "Burt (1992)" },
    { name: "The strength of weak ties", finding: "Novel information and opportunities usually arrive through acquaintances, not close friends.", cite: "Granovetter (1973)" },
    { name: "Energy & dormant ties", finding: "Who energizes you predicts performance; dormant ties, when reactivated, give unusually useful advice.", cite: "Cross & Parker; Levin, Walter & Murnighan" },
  ],
  "career-roadmap": [
    { name: "Skill-distance mobility", finding: "People move most successfully to occupations that are close in skill space; skill distance predicts real transitions.", cite: "O*NET skill taxonomy; task-based human capital" },
  ],
  myopia: [
    { name: "Competency trap", finding: "Repeatedly winning at today's game trains you to stop exploring, narrowing what you notice.", cite: "Levitt & March (1988); Levinthal, local search" },
    { name: "Three blind spots", finding: "Myopia is spatial (distant options), temporal (distant futures), and failure-avoidant (too few bold bets).", cite: "Organizational myopia; Levitt, “Marketing Myopia” (1960)" },
  ],
  pipeline: [
    { name: "The editorial process is a funnel", finding: "Submit → managing editor → deputy & senior editor → reviewers → senior editor aggregates → deputy editor decides. A series of filters that passes only 3–5% at top journals.", cite: "Hasan, Topics in Strategy (lecture)" },
    { name: "Raise the probability, not the volume", finding: "You can't out-write a 3–5% acceptance rate; the only lever that moves a portfolio is raising each paper's odds of getting in — convincing reviewers.", cite: "Hasan, Topics in Strategy" },
  ],
  "paper-study": [
    { name: "A research idea makes the invisible visible", finding: "An idea is a unique insight into why the facts are what they are: a new fact, or a known one explained.", cite: "Hasan, Research, Strategy" },
    { name: "The hourglass & the interaction", finding: "Papers move broad→narrow→broad; the contribution often lives in the interaction: IF X1→Y, especially/except when X2, because a mechanism.", cite: "Hasan, Research, Strategy" },
  ],

  // Canvas modules (keyed by exercise), so they get the same "research behind
  // this" surface as the predict-then-reveal modules.
  gas: [
    { name: "The GAS framework", finding: "Generality, Accuracy and Simplicity trade off — you can't max all three; a simple experience for users just relocates complexity to data, infrastructure, and new roles.", cite: "Hasan, Oettl & Samila, “From Model Design to Organizational Design”" },
    { name: "Predictability × cost of a mistake", finding: "Automate cheap-error, predictable work; keep humans as curators for mid-risk work and adjuncts for high-stakes decisions.", cite: "Dhar" },
  ],
  "four-a": [
    { name: "The 4A execution framework", finding: "Execution rests on Alignment, Ability, Architecture, and Agility; the weakest of the four caps the whole plan.", cite: "Superadditive" },
  ],
  scorecard: [
    { name: "The Balanced Scorecard", finding: "A strategy becomes measurable across four linked perspectives — Financial, Customer, Internal Process, Learning & Growth — as a cause-and-effect chain.", cite: "Kaplan & Norton" },
    { name: "Gameable measures", finding: "Targets drive behavior, including the wrong behavior when a measure can be gamed (e.g. Wells Fargo's “Eight is Great”).", cite: "Goodhart's law" },
  ],
  venture: [
    { name: "Five Forces", finding: "Industry attractiveness comes from rivalry, buyer and supplier power, substitutes, and barriers to entry.", cite: "Porter (1979)" },
    { name: "VRIN resources", finding: "A durable advantage is Valuable, Rare, Inimitable, and Non-substitutable.", cite: "Barney (1991)" },
    { name: "Profit pools", finding: "Where an industry earns its money is often not where it makes its sales.", cite: "Gadiesh & Gilbert" },
  ],
  ocfit: [
    { name: "Organizational-capability fit", finding: "A bet succeeds only when Tasks, People, Formal Systems, and Culture actually support it; the honest gap is where it breaks.", cite: "Organizational design" },
  ],
  experiment: [
    { name: "Discovery-driven planning", finding: "Test the assumptions a plan rests on with the smallest experiment that could disconfirm them, before you commit.", cite: "McGrath & MacMillan (1995)" },
  ],
  deeptech: [
    { name: "The Dual Uncertainty Canvas", finding: "Deep tech faces technical and market uncertainty at once; resolve the dominant one with the smallest, fastest experiment.", cite: "Duke University" },
  ],
  "paper-idea": [
    { name: "A research idea makes the invisible visible", finding: "An idea is a unique insight into why the facts are what they are — a new fact, or a known one explained.", cite: "Hasan, Research, Strategy" },
  ],
  "paper-structure": [
    { name: "The hourglass", finding: "A paper opens broad, narrows to the problem, approach, and findings, then widens to the contribution; five sections, each with one job.", cite: "Hasan, Research, Strategy" },
  ],
  "paper-points": [
    { name: "Making points", finding: "An article is a sequence of points that lead to a conclusion, and each paragraph makes exactly one.", cite: "Hasan, Research, Strategy" },
  ],
  interaction: [
    { name: "The interaction is the idea", finding: "In Y = β0 + β1X1 + β2X2 + β3(X1×X2), β3 is usually the contribution: IF X1 → Y, especially/except when X2, because a mechanism.", cite: "Hasan, Research, Strategy" },
  ],
};

export function frameworksFor(key?: string | null): Framework[] {
  return (key && FRAMEWORKS[key]) || [];
}

// Human labels for each report family, for the public research reference page.
export const GUIDE_LABELS: Record<string, string> = {
  "job-redesign": "Redesign Your Job with AI",
  resume: "Refresh Your Résumé",
  consult: "Diagnose Your Business",
  superpower: "Find Your Superpower",
  vision: "Shape Your Company Vision",
  "personal-network": "Map Your Personal Network",
  "career-roadmap": "Map Your Next Career Moves",
  myopia: "Find Your Blind Spots",
  pipeline: "Publication Pipeline",
  "paper-study": "Understand a Paper",
  gas: "Find Where AI Fits a Workflow",
  "four-a": "Score Your Execution Plan",
  scorecard: "Build a Balanced Scorecard",
  venture: "Pressure-Test a Business Idea",
  ocfit: "Should You Make This Bet?",
  experiment: "Design a Test for Your Strategy",
  deeptech: "Plan a Deep-Tech Venture",
  "paper-idea": "Make the Invisible Visible",
  "paper-structure": "Structure Your Paper",
  "paper-points": "Make Your Points",
  interaction: "Read the Interaction",
};

export function allFrameworkGroups(): { key: string; label: string; items: Framework[] }[] {
  return Object.keys(FRAMEWORKS).map((k) => ({ key: k, label: GUIDE_LABELS[k] || k, items: FRAMEWORKS[k] }));
}
