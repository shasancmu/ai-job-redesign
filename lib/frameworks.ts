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
    { name: "Peer review is a lottery", finding: "Top journals accept under 10%; a few noisy reviewers plus a variable editor make any single submission a coin-flip.", cite: "Hasan, Topics in Strategy (lecture)" },
    { name: "Productivity is a pipeline", finding: "Output comes from keeping several papers in flight and knowing when to kill one, not from a single bet.", cite: "Research-portfolio strategy" },
  ],
  "paper-study": [
    { name: "A research idea makes the invisible visible", finding: "An idea is a unique insight into why the facts are what they are: a new fact, or a known one explained.", cite: "Hasan, Research, Strategy" },
    { name: "The hourglass & the interaction", finding: "Papers move broad→narrow→broad; the contribution often lives in the interaction: IF X1→Y, especially/except when X2, because a mechanism.", cite: "Hasan, Research, Strategy" },
  ],
};

export function frameworksFor(key?: string | null): Framework[] {
  return (key && FRAMEWORKS[key]) || [];
}
