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
    { name: "Two kinds of idea", finding: "You either establish a new fact the field hadn't seen (e.g. the vast productivity dispersion across firms) or explain a known one (management practices explain that dispersion); each opens fresh questions.", cite: "Hasan, Research, Strategy (Research Ideas)" },
    { name: "The null model sets the bar", finding: "An idea's value is what it adds over the conventional wisdom a knowledgeable person already holds — no clear null, nothing to overturn.", cite: "Hasan, Research, Strategy (The Null Model)" },
  ],
  "paper-structure": [
    { name: "The hourglass", finding: "A paper opens broad, narrows to the problem, approach, and findings, then widens to the contribution; five sections, each with one job.", cite: "Hasan, Research, Strategy" },
    { name: "Nested parallelism", finding: "Six components — motivation, puzzle, solution, data, results, implications — repeat at three zooms: one sentence each in the abstract, one paragraph each in the intro, a full section each in the body.", cite: "Hasan, Research, Strategy (Structure)" },
    { name: "One job per section", finding: "Intro motivates and previews; Theory makes the non-obvious claim; Data & Methods earns trust; Results show the pattern survives; Discussion says what we learn.", cite: "Hasan, Research, Strategy" },
  ],
  "paper-points": [
    { name: "A paper is five parallel points", finding: "Motivation, the puzzle (we believe X; if true we'd see Z; but we see R), your solution, the evidence, and the implications — repeated in parallel through the paper.", cite: "Hasan, Research, Strategy" },
    { name: "The puzzle is a violated expectation", finding: "State it as belief → prediction → observation: 'we believe X; if true we'd see Z; but we observe R.' The gap between Z and R is the puzzle.", cite: "Hasan, Research, Strategy (Making Points)" },
    { name: "One point per paragraph", finding: "An article is a sequence of points leading to a conclusion; the test of a paragraph is whether a reader grasps its point without rereading.", cite: "Hasan, Research, Strategy" },
  ],
  interaction: [
    { name: "The interaction is the idea", finding: "In Y = β0 + β1X1 + β2X2 + β3(X1×X2), β3 is usually the contribution: IF X1 → Y, especially/except when X2, because a mechanism.", cite: "Hasan, Research, Strategy" },
    { name: "The condition, not the main effect", finding: "A flat X→Y is often unsurprising; the insight lives in the ESPECIALLY/EXCEPT WHEN Z and the BECAUSE mechanism — that's where you make the invisible visible.", cite: "Hasan, Research, Strategy (Theory)" },
    { name: "β₃ is heterogeneity", finding: "β₃ tells you for whom and when the effect is stronger or weaker; a flat, insignificant β₃ means the idea is thin, however clean the main effect.", cite: "Hasan, Research, Strategy (Data Analysis)" },
  ],
  "field-experiment": [
    { name: "The Strategy Experiment Canvas", finding: "Design a field experiment in eight parts: setup, setting & subjects, friction, insight, solution (treatment), why & when it works, the null, and impact on the business.", cite: "Hasan, Kim & Koning" },
    { name: "The experiment is a regression", finding: "Y = b0 + b1·T + b2·X + b3·(T·X): b1 is the average treatment effect, b3 the heterogeneous effect (works more or less for whom); design for power, watch attrition and the credibility of the null.", cite: "Hasan, Kim & Koning" },
    { name: "Six intervention patterns", finding: "Most strategy treatments are one of Training, Information, Incentives, Spillovers, Process, or Resource, each with a canonical field-experiment exemplar.", cite: "Hasan, Kim & Koning" },
  ],
  "research-quality": [
    { name: "Make the invisible visible against a null", finding: "A good idea overturns a clear conventional wisdom (the null) and reveals a hidden factor others miss.", cite: "Hasan, Research, Strategy" },
    { name: "Important, Interesting, Ambitious, Craft", finding: "Execution is judged on whether adults care, whether it's deep enough to debate, whether few could do it, and whether every detail is right.", cite: "Hasan, Research, Strategy" },
  ],
  "reg-tables": [
    { name: "One idea per table", finding: "A clear table spotlights the key coefficient and builds columns as a narrative, so the reader sees the finding survive each specification.", cite: "Hasan, Research, Strategy (craft)" },
    { name: "Three primary tables", finding: "Table 1 shows the claim against a strong null; Table 2 the implications; Table 3 the scope conditions — interactions showing where the effect is strongest.", cite: "Hasan, Research, Strategy (Results)" },
    { name: "Columns as a narrative", finding: "Baseline → add controls → add fixed effects → add the interaction, so the reader watches the result survive each tougher specification.", cite: "Hasan, Research, Strategy" },
  ],
  "research-graphs": [
    { name: "The graph is the argument", finding: "Maximize the data-ink ratio and cut chartjunk; the right encoding shows the finding directly.", cite: "Tufte, The Visual Display of Quantitative Information" },
    { name: "Show the finding, not the data dump", finding: "Pick the encoding that makes the effect — and its heterogeneity — visible at a glance, so the figure answers the research question without a table.", cite: "Hasan, Research, Strategy (craft)" },
  ],
  "lit-review": [
    { name: "Support and gap, not summary", finding: "A literature review grounds your claims in prior work and highlights the gap that becomes your contribution — organized by ideas, not paper by paper.", cite: "Hasan, Research, Strategy" },
    { name: "Two jobs", finding: "It supports the claims you test AND the foundational premises you don't test — the logical bridges your argument rests on but never puts in a regression.", cite: "Hasan, Research, Strategy (Literature Reviews)" },
    { name: "Summarize each paper as a canvas", finding: "Reduce every paper you read to IF X THEN Y, ESPECIALLY/EXCEPT WHEN Z, BECAUSE — then synthesize by idea to surface the gap.", cite: "Hasan, Research, Strategy" },
  ],
  vrino: [
    { name: "VRIN+O for data", finding: "Data is a moat when it's Valuable (lets you publish what others can't), Rare, Inimitable, Non-substitutable, and you're Organized to capture the value.", cite: "Barney (1991), applied to data by Hasan, Research, Strategy" },
    { name: "The moat is what only you can publish", finding: "Rare data or access is Ambition in the four tests — it lets you make the invisible visible where competitors are blind, and it's hard for others to replicate.", cite: "Hasan, Research, Strategy" },
  ],
  "data-strategy": [
    { name: "Every data source buys something different", finding: "Public, administrative/trace, survey, experimental, qualitative, and simulated data trade off causality, generalizability, detail, and cost; the choice follows the claim.", cite: "Hasan, Research, Strategy" },
    { name: "Measurement — intervention — measurement", finding: "A field experiment measures fixed traits, outcomes, and mechanisms before and after the intervention; align your measures with established, high-quality instruments.", cite: "Hasan, Research, Strategy (Experimental Data)" },
    { name: "Six intervention patterns", finding: "Most treatments are Training, Information, Incentives, Spillovers, Process, or Resources — each addressing a specific friction; naming which clarifies what you're testing.", cite: "Hasan, Kim & Koning" },
  ],
  identification: [
    { name: "The two problems", finding: "Reverse causality (fix it by measuring X before Y) and the 'all else equal' problem — an unobserved M drives both X and Y. The second is the hard one, with as many confounding stories as readers.", cite: "Hasan, Research, Strategy (Causal Inference)" },
    { name: "The gradient of control", finding: "Control variables (weak — the dangerous confounders are unobserved) → fixed effects (time-invariant unobservables) → IV / DiD / RD (time-varying) → the RCT, gold standard by balance.", cite: "Hasan, Research, Strategy; Angrist & Pischke" },
    { name: "Why randomization works", finding: "Random assignment is uncorrelated with every pre-treatment trait — even the ones you can't observe — so a surviving X→Y correlation can only be the effect of X.", cite: "Hasan, Research, Strategy" },
  ],
  referee: [
    { name: "How referees judge", finding: "Reviewers weigh the contribution, the credibility of the evidence, the positioning, and the polish — and first impressions matter.", cite: "Hasan, Research, Strategy (reviewing)" },
    { name: "First impression, then justification", finding: "Most reviewers form a quick view and use the rest of the read to justify it — so the abstract and introduction must land the contribution fast.", cite: "Hasan, Research, Strategy" },
    { name: "Reviewing is training", finding: "Judging others' work on question, method, and contribution sharpens your ability to evaluate — and pre-empt the critiques on — your own.", cite: "Hasan, Research, Strategy" },
  ],
  rnr: [
    { name: "An R&R is an exam", finding: "The reviewers pose questions; you pass by answering each thoroughly and systematically, not by winning every argument — most accepted papers survive several rounds.", cite: "Hasan, Research, Strategy" },
    { name: "A revision document", finding: "List every comment and your explicit response; engage even where you disagree, with clear reasoning; a systematic, organized reply signals professionalism.", cite: "Hasan, Research, Strategy" },
    { name: "Rejection is the norm", finding: "Diagnose which it was — poor fit, methodological flaw, thin theory, or unclear writing — then revise and resubmit; many great papers were rejected first.", cite: "Hasan, Research, Strategy (Rejected Papers)" },
  ],
  "journal-fit": [
    { name: "Fit is half the battle", finding: "The right journal matches the paper's audience, scope, and level; the wrong venue is a fast desk-reject, and a cover letter argues the fit.", cite: "Hasan, Research, Strategy" },
    { name: "Fit vs prestige vs speed", finding: "Top journals bring status and fierce competition; niche venues bring faster decisions and a targeted audience — weigh the trade-off for this paper and this career stage.", cite: "Hasan, Research, Strategy (Choosing a Journal)" },
    { name: "Publishing is a lottery", finding: "Acceptance at top journals runs 3–7%, and noisy editors aggregate reviewer votes differently; a pipeline of papers, each with its odds raised, beats betting on one.", cite: "Hasan, Research, Strategy" },
  ],
  theory: [
    { name: "Null model → non-obvious claim", finding: "A theory section sets up the view most people hold, advances a claim that departs from it, and gives the mechanism — the reasons to believe.", cite: "Hasan, Research, Strategy" },
    { name: "Argue against yourself", finding: "Presenting compelling counter-arguments raises the stakes: if the opposite is plausible, your evidence can actually shift beliefs. If everyone already agrees, the paper teaches nothing.", cite: "Hasan, Research, Strategy (Theory)" },
    { name: "Build belief in steps", finding: "Chain smaller, intuitive or established claims and link them to your bigger claim; then add scope claims (when it holds) and extension claims (what else it implies).", cite: "Hasan, Research, Strategy" },
  ],
  abstract: [
    { name: "The abstract is an hourglass", finding: "It moves from motivation to problem to approach to findings to contribution, and the title should communicate the idea and be findable.", cite: "Hasan, Research, Strategy" },
    { name: "Six sentences", finding: "Motivation, puzzle, solution, data, results, implications — one tight sentence each, concrete (give effect sizes). The abstract is the whole paper in miniature.", cite: "Hasan, Research, Strategy (Abstract)" },
    { name: "A title for findability", finding: "Communicate the benefit in words your audience actually searches; a clever-but-opaque title (his own 'Mechanics of Social Capital…') costs you readers.", cite: "Hasan, Research, Strategy (Title)" },
  ],
  "research-system": [
    { name: "Automate and delegate", finding: "A research system that automates drudgery (scripts, linked tables, a clean directory) and delegates the rest gets you to the creative work faster.", cite: "Hasan, Research, Strategy" },
    { name: "The project directory", finding: "canonical → code → derived → tables → figures, with createData / createTables / createFigures, so anyone can rebuild every result from the raw data.", cite: "Hasan, Research, Strategy (Project Directory)" },
    { name: "Clear, concise, complete code", finding: "A reader can reconstruct every table from raw data and understand every line — increasingly required as journals mandate code submission.", cite: "Hasan, Research, Strategy" },
  ],
  "research-team": [
    { name: "The architect, builder, electrician", finding: "Strong papers are coauthored by complements: big-picture framing, the writer, and the data/analysis lead.", cite: "Hasan, Topics in Strategy (lecture)" },
    { name: "The weakest-link problem", finding: "A paper is only as strong as its least-reliable coauthor; choose collaborators for trust and reliability, and align roles to strengths early.", cite: "Hasan, Research, Strategy (Teams)" },
    { name: "Master builder vs team", finding: "Solo gives total control but doesn't scale and exposes every weakness; coauthoring trades control for complementary skill, shared learning, and a bigger pipeline.", cite: "Hasan, Research, Strategy" },
  ],
  "phd-what": [
    { name: "A PhD is research training", finding: "A business PhD trains you to become a professor who produces knowledge; the two tangible products are papers and presentations.", cite: "Hasan, Research, Strategy" },
  ],
  "phd-choose": [
    { name: "Placement is the signal", finding: "Where a program's graduates get jobs predicts your outcome better than general prestige, because top programs place students at top departments.", cite: "Hasan, Research, Strategy" },
  ],
  "phd-apply": [
    { name: "Admissions is a de-risked bet", finding: "The committee invests ~$300k betting you'll become a researcher who publishes; they read the application as evidence of E[p] (quality) and E[n] (drive).", cite: "Hasan, Research, Strategy" },
  ],
  "phd-structure": [
    { name: "The phases of a PhD", finding: "Coursework and comps, a qualifying paper and advisor, the research pipeline, the job-market paper, then the job market — each with its own job.", cite: "Hasan, Research, Strategy" },
  ],
  "phd-succeed": [
    { name: "Visibility and the two products", finding: "The students who thrive are present in the intellectual life, produce papers and presentations, take advice, and model the best above them.", cite: "Hasan, Research, Strategy (Getting Out)" },
  ],
  "phd-placement": [
    { name: "Important, Interesting, Ambitious", finding: "A job-market paper wins a hire when it solves a real problem, is novel and non-obvious, and few could have done it — backed by a pipeline.", cite: "Hasan, Topics in Strategy (lecture)" },
  ],
  "ai-rules": [
    { name: "Expert systems and the knowledge bottleneck", finding: "Hand-coded IF-THEN rules (e.g. MYCIN) could match experts, but a human had to foresee and encode every case — brittle and unscalable.", cite: "MYCIN, Shortliffe (1976)" },
  ],
  "ai-learning": [
    { name: "Statistical beats clinical judgment", finding: "Simple actuarial models fit to data routinely match or beat expert judgment on the same inputs.", cite: "Meehl (1954); Dawes, Faust & Meehl (1989)" },
    { name: "Neural nets are learned functions", finding: "Deep networks are flexible function approximators; AlexNet (2012) showed the bottleneck was data and compute, not the idea.", cite: "Krizhevsky, Sutskever & Hinton (2012)" },
  ],
  "ai-language": [
    { name: "Next-word prediction, from n-grams to attention", finding: "Early models predicted the next word from the last few (Markov/n-grams); the Transformer's attention gave a long, learned memory.", cite: "Shannon (1948); Vaswani et al., “Attention Is All You Need” (2017)" },
  ],
  "ai-scale": [
    { name: "The bitter lesson and scaling laws", finding: "General methods that leverage compute win, and error falls predictably with scale — empirically robust, with real caveats.", cite: "Sutton (2019); Kaplan et al. (2020); Hoffmann et al. / Chinchilla (2022)" },
    { name: "Self-play needs a verifiable signal", finding: "AlphaZero learned by self-play; self-generated data helps only when the result can be checked, or quality degrades.", cite: "Silver et al. (2017); Shumailov et al. (2024)" },
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
  interaction: "The Anatomy of an Idea",
  "field-experiment": "The Strategy Experiment",
  "research-quality": "What Makes a Paper Good",
  "reg-tables": "Clear Regression Tables",
  "research-graphs": "Elegant Research Graphs",
  "lit-review": "Position Your Literature Review",
  vrino: "Is Your Data a Moat?",
  "data-strategy": "Choose Your Data Strategy",
  identification: "Is Your Identification Credible?",
  referee: "Meet Your Reviewers",
  rnr: "The R&R War Room",
  "journal-fit": "Journal Fit & Cover Letter",
  theory: "Build Your Theory Section",
  abstract: "The Abstract & Title",
  "research-system": "Design Your Research System",
  "research-team": "Build Your Research Team",
  "phd-what": "Is a Business PhD for You?",
  "phd-choose": "Choose a PhD Program",
  "phd-apply": "Get Into a PhD Program",
  "phd-structure": "How a PhD Works",
  "phd-succeed": "Succeed in Your PhD",
  "phd-placement": "Land an Academic Job",
  "ai-rules": "How AI Works: Rules",
  "ai-learning": "How AI Works: Learning",
  "ai-language": "How AI Works: Language",
  "ai-scale": "How AI Works: Scale & Limits",
};

export function allFrameworkGroups(): { key: string; label: string; items: Framework[] }[] {
  return Object.keys(FRAMEWORKS).map((k) => ({ key: k, label: GUIDE_LABELS[k] || k, items: FRAMEWORKS[k] }));
}
