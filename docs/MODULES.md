# Superadditive — Module Reference

Every exercise in the app: how it works, the learner's sequence of actions, what the report produces, and the research it's based on.

Modules are short, AI-run exercises (mostly 15–30 minutes) that end in a real artifact. The design principle throughout is **human + AI, worth more together**: each exercise draws the line between the judgment/taste/relationships only a person brings and the work AI can take on.

---

## How the exercises work (cross-cutting mechanics)

**The canvas engine.** Most "sharpen a decision" and research modules run on one generic engine (`CanvasRoom`): **Name it → talk it through with AI (~6 questions) → the AI drafts your canvas → you edit it → keep a printable artifact.** A module is added by writing a framework definition (`CanvasDef`), not new code.

**Bespoke rooms.** Higher-touch exercises have their own components — a live two-person room, a voice interview, a multi-agent board, a negotiation roleplay, a paste-and-analyze tool, or a Monte-Carlo simulation.

**Predict-then-reveal.** Ten modules gate the report behind a prediction: you commit a guess *before* the AI reveals its analysis, then a guided walkthrough shows what each section means and how it was built from your own answers. This is the generation effect — the gap between your guess and the result is the lesson. Modules with it are tagged **[predict]** below.

**Delivery tags.** **[voice]** = hands-free spoken interview. **[camera]** = reads a photo of your operation. **[live]** = whole-cohort activity that draws itself as the room responds. **[free]** = free to run; everything else is paid or bundled.

**Models.** The AI backend is provider-configurable via environment; the production deployment runs Claude (Sonnet-class) with a vision model for the photo read.

**Credentials.** Finishing exercises earns **certificates** (see the last section) — each certificate is a *bundle* of related modules (core + choose-N electives), not a single exercise.

---

## Work & AI — redesign your work around AI

### Redesign Your Job with a Partner
`reimagine-job` · 30 min · with a partner · **[predict]**
- **How it works:** a live two-person breakout room (`Room`). An AI interviewer (framed as a qualitative-methods professor) runs the conversation while you and a partner interview each other.
- **Sequence:** interview each other → sort your tasks into a 2×4 model → build an implementation plan (the plan step is predict-then-reveal: guess which one part only *you* can do and which AI could take, then reveal).
- **Report:** your role split into AI columns (**search, structure, think, translate**) and human columns (**lead, own, judge, integrate**), plus an implementation plan with a starter for each delegated task.
- **Research:** the economics of **comparative advantage**; qualitative interview craft after **Small & Calarco (2022)**.

### Redesign Your Job with AI
`solo-ai` · 18 min · with AI · **[predict]** · **[free-tier]**
- **How it works:** the solo version (`SoloRoom`) — the AI interviews you, then drafts the 2×4 redesign; predict-then-reveal at the plan step.
- **Report / research:** same 2×4 model and implementation plan as above; comparative advantage.

### Redesign a Workflow with a Partner
`reimagine-workflow` · 30 min · with a partner · **[free]**
- **How it works:** two people, one shared canvas (`WorkflowRoom`). The AI interviewer maps how a specific workflow runs today, start to finish.
- **Sequence:** name the workflow → map the as-is steps (all human) → AI surfaces where AI fits and redraws the flow → recolor who does what (human / human+AI / AI).
- **Report:** a redrawn workflow with per-step ownership and the AI opportunities in it.
- **Research:** **task allocation**; automation-versus-augmentation trade-offs.

### Redesign a Workflow with AI
`workflow-solo` · 30 min · with AI · **[free]**
- The solo version (`SoloWorkflowRoom`) — AI plays the partner. Same flow, report, and basis as above.

### Analyze a Role's AI Exposure
`jd-x-ray` · 14 min · with AI
- **How it works:** paste a job description; the AI decomposes and scores it (`CareerXrayView`). No interview.
- **Sequence:** paste a role → AI breaks it into tasks → scores each task's AI exposure → benchmarks role vs. occupation → rewrites it as a human+AI role → sourcing plan.
- **Report:** two exposure gauges (**top-down** occupation vs. **bottom-up** role — "the gap is the point"); a task table with **E0/E1/E2** exposure badges and substitute/complement; new tasks; durable value; career vectors.
- **Research:** **Autor's task framework**; the **Eloundou et al.** exposure rubric (E0/E1/E2); **Acemoglu & Restrepo's "new tasks"**; occupation match via **O\*NET/SOC**.

### Analyze Your Career's AI Exposure
`career-x-ray` · 14 min · with AI
- Same engine as above, pointed at your résumé. Adds durable value, career vectors, and a job-search plan.
- **Research:** Autor (tasks), Eloundou et al. (exposure), **Brynjolfsson–Rock** (bottom-up vs. top-down), Acemoglu–Restrepo (new work).

### Map Your Next Career Moves
`career-roadmap` · 16 min · with AI · **[predict]** · **[free-tier]**
- **How it works:** `CareerRoadmapRoom` reuses your saved résumé; a short interview fills gaps. Predict your next move (and how sure you are) before the reveal.
- **Report:** 2–3 anchor occupations; skill-adjacent candidate roles with a skill-match score and Job Zone; a skills radar (you vs. target); gaps; a sequenced 0–24-month roadmap (lateral / step-up / stretch).
- **Research:** **labor economics, the O\*NET skill taxonomy, task-based human capital, and occupational mobility** (skill distance predicts real transitions).

### Find Your Superpower
`find-superpower` · 20 min · with AI · **[predict]**
- **How it works:** `SuperpowerRoom` runs a story interview (never "what are you good at?" — it draws out specific best-self moments), then names the through-line.
- **Sequence:** seed a few moments → interview pulls 4–6 stories across unrelated wins → predict your superpower → reveal a ranked stack.
- **Report:** a ranked **stack** of 2–3 superpowers (name / what it is / evidence / why it's rare); how they combine; a **VRIN-O** read (valuable, rare, inimitable, non-substitutable, organized); moat strength; a plan; the shadow side.
- **Research:** **Reflected Best Self** + **Behavioral Event Interviewing** for elicitation; the **resource-based view (VRIN-O)** for the moat — a superpower as a *cross-domain invariant*.

### Refresh Your Résumé
`refresh-resume` · 20 min · with AI · **[predict]**
- **How it works:** `ResumeRoom` prefills from a prior X-ray; an AI coach interviews about your last year, laddering duty → outcome → metric.
- **Report:** where your résumé stands; wins you left off, drafted as bullets in **X-Y-Z form**; before/after line rewrites; structure fixes.
- **Research:** results-first, X-Y-Z bullet construction.
- **Voice variant:** `refresh-resume-voice` (`VoiceResumeRoom`) — same report, spoken. **[voice] [predict]**

### Find Your Career's Blind Spots
`career-myopia` · 20 min · with AI · **[predict]**
- **How it works:** `MyopiaRoom` (career mode). Predict your biggest blind spot (and how confident you are you can see it) before the reveal.
- **Sequence:** AI interview maps your career as a bundle of choices (skills & craft, role & positioning, network, bets) → diagnoses three blind spots → an exploration plan.
- **Report:** the **competency trap**; three blind spots — **spatial** (adjacent fields you dismiss), **temporal** (how your field will shift, including AI), **failure** (bold bets you avoid; a suspicious lack of failure signals too little exploration); a local-peak gap; a plan.
- **Research:** the **organizational-myopia framework** (spatial / temporal / failure) and the **competency trap**, applied to a career.

### Map Your Personal Network
`personal-network` · 22 min · with AI · **[predict]**
- **How it works:** `PersonalNetworkRoom` builds a contact roster and computes your ego-network stats in code, then the AI reads them. Predict your most central person first.
- **Sequence:** list contacts across four worlds (inside org / outside / field / personal), tag tie strength and who energizes or drains you, mark who-knows-whom → the graph and metrics compute → AI read.
- **Report:** computed metrics — **effective size, efficiency, constraint, density, diversity, energy balance**, bridges and embedded core — plus the AI's gaps (thin world, echo chamber, over-reliance on strong ties, a structural hole to fill).
- **Research:** **Ron Burt** (structural holes, brokerage, constraint), **Mark Granovetter** (strength of weak ties), **David Krackhardt** (closure, Simmelian ties), **Rob Cross** (energy and dormant ties).

### Find Collaborators
`find-collaborators` · 5 min · with AI
- **How it works:** describe your work; `FindCollaboratorsRoom` returns ranked matches (Scientifiq).
- **Report:** researchers ranked by **genuine complementarity, not similarity** (favors adjacent fields and least-likely-known people), each with why they complement you, what to propose, and a ready-to-send intro.
- **Research:** **Scientifiq.AI** potential scoring over bibliometric data; co-authorship complementarity.

---

## Sharpen a decision — strategy

### Pressure-Test a Business Idea
`good-business` · 22 min · with AI
- **How it works:** canvas (`VENTURE`) with a live unit-economics calculator the AI seeds and you tweak.
- **Report:** ratings (0–100) for **industry attractiveness, durable advantage, strategic fit, profit-pool position**; fields for the idea, customer, edge, activity-system fit, profit pool, market size, "what would need to be true," and risks; the calculator computes **CAC, LTV, LTV:CAC, payback, break-even**; a verdict on whether it's a good business.
- **Research:** **Porter's Five Forces, VRIN resources, activity-system fit, profit pools**, plus unit economics — mapped to interview questions without naming the frameworks aloud.

### Diagnose Your Business in 30 Minutes
`business-consult` · 30 min · with AI · **[camera] [predict]**
- **How it works:** `ConsultRoom` — an interview, a management-practices survey, and a **vision-model read of a photo of your operation**, then an 80/20. Predict your biggest constraint first.
- **Report:** the bottom line; whether you compete on cost or value; your **margin engine** (levers: volume / price / cost); your **profit pool** ("the popcorn"); management-practice gaps and fixes; the 80/20; the upstream binding constraint; a prioritized plan.
- **Research:** **management practices (Bloom, Van Reenen & Sadun)** raise productivity and margin; value creation/capture (WTP vs. cost); profit pools; the 80/20 rule.
- **Voice variant:** `voice-consult` (`VoiceConsultRoom`) — same consult, spoken, no photo. **[voice] [predict]**

### Should You Make This Bet?
`opportunity-capability` · 20 min · with AI
- **How it works:** canvas (`OCFIT`) with a fit score.
- **Report:** capability alignment across **Tasks, People, Formal Systems, Culture**; the biggest gap; what to build first; a 0–100 "capability fit" score and a call.
- **Research:** organizational-capability fit (Tasks / People / Formal Systems / Culture).

### Score Your Execution Plan
`execution-4a` · 20 min · with AI
- **How it works:** canvas (`FOURA`); scores feed a cohort heatmap.
- **Report:** 0–100 ratings for **Alignment, Ability, Architecture, Agility**, a diagnosis and highest-leverage fix per dimension, and the one move that unlocks execution.
- **Research:** the **4A execution framework**.

### Build a Balanced Scorecard
`balanced-scorecard` · 20 min · with AI
- **How it works:** canvas (`SCORECARD`).
- **Report:** for each of **Financial, Customer, Internal Process, Learning & Growth** — an Objective, Key Results (Measure + Target), and Initiatives — forming a cause-and-effect chain; a through-line verdict.
- **Research:** the **Balanced Scorecard (Kaplan & Norton)**; a "Wells Fargo / Eight-is-Great" cautionary case against gameable measures.

### Find Where AI Fits a Workflow
`ai-canvas` · 20 min · with AI
- **How it works:** canvas (`GAS`) with a Generality × Accuracy frontier plot.
- **Report:** the strategic bet; the frontier (required accuracy, required generality, and where the workflow sits: automate / copilot / adjunct); the human/human+AI/AI task split; where the complexity relocates (data, infrastructure, compliance, new roles); complements that rise in value; deployment.
- **Research:** the **GAS framework (Hasan, Oettl & Samila, "From Model Design to Organizational Design")** — Generality, Accuracy, Simplicity trade off; **Dhar's** predictability × cost-per-mistake map; the accuracy ceiling; relocated complexity.

### Design a Test for Your Strategy
`test-the-bet` · 18 min · with AI
- **How it works:** canvas (`EXPERIMENT`).
- **Report:** the hypothesis; control vs. change; the outcome metric (the "so-what"); how to run it cleanly; the decision rule; confounds; the test in one line.
- **Research:** **discovery-driven planning** and assumption testing.

### Plan a Deep-Tech Venture
`deeptech-canvas` · 22 min · with AI
- **How it works:** canvas (`DEEPTECH`) with a Market × Technical uncertainty quadrant.
- **Report:** the technology and its trade-offs; candidate applications with customer evidence and value; the priority bet; the minimum viable experiment (with a success signal and a kill criterion); commitments and irreversibilities; funder match; a one-sentence strategy.
- **Research:** the **Dual Uncertainty Canvas (Duke University)** — resolve the dominant uncertainty (technical vs. market) with the smallest, fastest experiment.

### Convene Your AI Board
`ai-board` · 15 min · with AI
- **How it works:** `BoardRoom` — a multi-agent live debate you moderate.
- **Sequence:** describe a decision (attach materials) → four personas debate and rebut each other → you interject → call the vote.
- **Report:** the core tension, the recommended move, and what would have to be true.
- **Research:** a deliberately diverse roster (**growth optimist, skeptic/devil's advocate, the customer, operator/CFO**) reasoning via options, opportunity cost, expected value and asymmetry — a structured antidote to **groupthink**.

### Understand Your Customer
`customer-empathy` · 15 min · with AI
- **How it works:** `EmpathyRoom` mints a shareable link; each customer has an AI empathy chat (it never pitches); you collect the profiles and synthesize.
- **Report:** per customer, an **empathy map** (say / think / do / feel), the core **Job-to-be-Done**, pains, gains, how to serve, and verbatim quotes; the aggregate surfaces themes, customer types, and unmet needs.
- **Research:** the **design-thinking tradition (IDEO / d.school)** and **Jobs-to-be-Done**; the classic empathy map.

### Find Your Business's Blind Spots
`business-myopia` · 20 min · with AI · **[predict]**
- **How it works:** `MyopiaRoom` (business mode) — same engine as career myopia, over Product, Organization, Innovation, Marketing.
- **Report:** the competency trap and three blind spots (spatial / temporal / failure), with an exploration plan.
- **Research:** the **organizational-myopia framework**; **marketing myopia**; disrupted-incumbent cases (Kodak, BlackBerry).

### Shape Your Company Vision
`define-vision` · 25 min · with AI · **[predict]**
- **How it works:** `VisionRoom` — a guided conversation. Predict the real reason the organization exists before the reveal.
- **Report:** a one-liner; **core values** (with meaning) and **core purpose** (the enduring core); a **BHAG** and vivid description of the envisioned future; how to use it.
- **Research:** the vision framework of **Jim Collins & Jerry Porras** (enduring core vs. envisioned future; the BHAG).
- **Voice variant:** `define-vision-voice` (`VoiceVisionRoom`). **[voice] [predict]**

### Vet a Vendor's Disclosure
`vendor-disclosure` · 10 min · with AI
- **How it works:** `DisclosureRoom` — you mint a link; the vendor fills a disclosure with no account; the AI reviews it.
- **Report:** completeness scores and red flags across five domains — **capabilities & intended use; performance & compliance; data stewardship; integration & cost; lifecycle & support**.
- **Research:** a generalized adaptation of the **HAIP AI Vendor Disclosure Framework (Health AI Partnership)** — its five domains and "minimum information for transparency."

### Domain Expertise Brief
`domain-brief` · 4 min · with AI
- **How it works:** `DomainBriefRoom` — semantic search over papers and researchers (Scientifiq).
- **Report:** leading experts with potential scores and representative work; sub-field composition and trajectory; standout high-potential papers; an honest read of strength vs. whitespace.
- **Research:** **Scientifiq.AI** (a forward-looking potential signal computed at publish, not citations); paper-to-patent linkage (**Marx & Fuegi, *Reliance on Science***).

### Licensing Brief
`licensing-brief` · 5 min · with AI
- **How it works:** paste an invention abstract/disclosure and constraints; `LicensingBriefRoom` scores it and maps the patent landscape.
- **Report:** commercial/scientific/social potential scores; comparable science; the nearby **patent landscape with assignees** (who's active, who might license or compete); the bottom line, likely licensees, IP read, honest risks, and an ordered outreach plan.
- **Research:** **Scientifiq.AI** predictive potential over research and patent data.

---

## Negotiate — bargain live against an AI counterpart

The five bargaining exercises run on one engine (`NegotiationRoom`): a live roleplay against an AI counterpart with **hidden payoff tables and floors**, scored in code, then debriefed by an AI coach. None use predict-then-reveal.

### Negotiate a Job Offer
`close-the-offer` · 30 min · with AI
- **Setup:** multi-issue integrative — 6 issues, hidden priorities on both sides.
- **Report:** your points and theirs; **joint value vs. the maximum possible (efficiency %)**; whether you beat your walk-away (BATNA); a per-issue breakdown; whether you found the key logroll and took the compatible wins; a coach debrief.
- **Research:** the **integrative-bargaining** tradition — create value by trading across issues (BATNA, Pareto efficiency, logrolling).

### Ask for a Raise
`ask-for-a-raise` · 25 min · with AI
- Multi-issue integrative (raise, title, remote days, PTO, review timing, learning budget). Same engine, report, and integrative-bargaining basis.

### Close a Vendor Deal
`close-the-vendor-deal` · 25 min · with AI
- Multi-issue B2B integrative (price, term, payment, support tier, onboarding, reference). Same engine and basis.

### Practice a Price Negotiation
`name-your-price` · 20 min · with AI
- **Setup:** single-issue distributive — buy a used van from an AI seller with a hidden floor.
- **Report:** the agreed price; the **ZOPA** (the low end you couldn't see); your surplus vs. walk-away; your share of the gap; a coach debrief.
- **Research:** **distributive bargaining** — anchoring, walk-aways (BATNA), and the zone of possible agreement.

### Negotiate the Rent
`lease-the-space` · 20 min · with AI
- Single-issue distributive (tenant vs. AI landlord, hidden floor). Same ZOPA/anchoring engine and basis as above.

### Rehearse a Hard Conversation
`rehearse-hard-conversation` · 20 min · with AI · **[voice]**
- **How it works:** `HardConvoRoom` — a live roleplay where the AI stays in character and never coaches mid-scene, then a coach debriefs the transcript.
- **Sequence:** pick a scenario (let someone go, give tough feedback, deny a promotion, deliver a PIP, push back on your boss) → rehearse live → coach walkthrough.
- **Report:** a debrief on clarity, respect, structure, holding the line, and a clear next step.
- **Research:** feedback science (**Situation–Behavior–Impact**) and **deliberate practice**.

---

## Research & scholarship — from Sharique Hasan's *Research, Strategy*

For PhD students and early-career researchers. Four are canvas modules; two are bespoke (with predict-then-reveal). All are **[free]**.

### Make the Invisible Visible
`what-is-a-paper` · 12 min · with AI
- **How it works:** canvas (`PAPER_IDEA`).
- **Report:** the phenomenon and the invisible force behind it; whether you're establishing a new fact or explaining a known one; what's been overlooked; your one-sentence insight and who should care.
- **Research:** ***Research, Strategy* (Hasan)** — a research idea is a unique insight into why the facts are what they are; it makes an invisible force visible.

### Structure Your Paper
`paper-structure` · 14 min · with AI
- **How it works:** canvas (`PAPER_STRUCTURE`).
- **Report:** the **hourglass** (motivation → problem → approach → findings → contribution) and a section map (Introduction, Theory, Data & Methods, Results, Discussion → the job of each).
- **Research:** the **hourglass** paper structure and the "null model → non-obvious claim" theory move (*Research, Strategy*).

### Make Your Points
`making-points` · 13 min · with AI
- **How it works:** canvas (`PAPER_POINTS`) — a ruthless-editor voice.
- **Report:** the five introduction topic sentences (it matters → the alternative view → your evidence → the finding → why it matters) and the single conclusion they build to.
- **Research:** *Research, Strategy* — an article is a sequence of points, one per paragraph. "What is your point?"

### Read the Interaction
`read-the-interaction` · 13 min · with AI
- **How it works:** canvas (`INTERACTION`).
- **Report:** Y, X1, X2 and the sign of β3 (especially vs. except); the one-sentence idea; the mechanism (the BECAUSE); what the main effect alone would miss.
- **Research:** *Research, Strategy* — in `Y = β0 + β1·X1 + β2·X2 + β3·(X1×X2)`, the interaction is usually the idea: **IF X1 → Y, ESPECIALLY/EXCEPT WHEN X2, BECAUSE a mechanism.**

### Publication Pipeline
`publication-pipeline` · 12 min · with AI · **[predict]**
- **How it works:** `PipelineRoom` — a client-side **Monte-Carlo simulation** of peer review (n reviewers each accept with probability p; an editor aggregates; a paper cycles journals until it lands or you kill it), then an AI advisor. Predict how many papers you must write before the reveal.
- **Report:** single-journal acceptance %, odds a paper ever lands, **papers you must write** to hit your target, average submissions per paper, months in review, how many to keep in flight, and pace needed vs. actual; a candid pipeline strategy.
- **Research:** the publishing "lottery" from **Hasan's *Topics in Strategy* lecture** — top journals accept under 10%; productivity is a pipeline, not a single bet.

### Understand a Paper
`understand-a-paper` · 16 min · with AI · **[predict]**
- **How it works:** `PaperStudyRoom` — paste a paper (or use the built-in example) and predict its core idea; the AI then reverse-engineers it through the four frameworks above.
- **Report:** the paper in a line; its idea (invisible force; new vs. known fact); its hourglass; its five points; its key interaction.
- **Research:** all four *Research, Strategy* frameworks. Built-in example: ***Experimentation and Startup Performance: Evidence from A/B Testing*** (Koning, Hasan & Chatterji).

---

## Run it live in class — cohort activities

Instructor-run, cohort-required, computed live (no AI generation). **[free] [live]**

### You vs. AI: A Reasoning Test
`benchmark` · 10 min · group
- Take a timed reasoning set; your score joins a live histogram of the whole room next to AI's score on the same questions.
- **Research:** human-vs-machine reasoning comparisons.

### Map the Room's Network (Live)
`network` · 8 min · group
- Everyone anonymously names advice-givers and friends; the room's networks draw themselves live and reveal who's most central. Centrality is computed in code.
- **Research:** **network science** — centrality, weak ties, and how influence flows (**Granovetter, Burt, Cross**).

---

## Credentials — how completions become certificates

Individual completions are **progress and a transcript**, not standalone credentials. A **certificate** is earned by finishing a **bundle**: its **core** modules plus a **choose-N of the electives** (like a concentration). Each certificate has a public verify page (`/c/<id>`), an "Add to LinkedIn" button, and the skills it demonstrates; the verify page lists the modules the holder actually completed.

Built-in bundles (editable by a superadmin; org directors can author their own org-scoped ones):

| Certificate | Core | Electives (choose 1) |
|---|---|---|
| **AI-Augmented Work Redesign** | Redesign Your Job with AI · Redesign a Workflow with AI | Career X-ray, AI Opportunity Canvas, and others |
| **Business Strategy & Execution** | Pressure-Test a Business Idea · Score Your Execution Plan | Test-the-Bet, Opportunity–Capability, Scorecard, Consult, Board, Business Myopia |
| **Professional Negotiation** | Negotiate a Job Offer · Practice a Price Negotiation | Ask for a Raise, Vendor Deal, Lease, Hard Conversation |
| **Career Strategy & Growth** | Career X-ray · Career Roadmap | Résumé, Superpower, Personal Network, Career Myopia |
| **New Venture Development** | Pressure-Test a Business Idea · Understand Your Customer | Pricing Negotiation, Deep-Tech, Test-the-Bet, Vision |
| **Social Science Research Foundations** | Make the Invisible Visible · Structure Your Paper · Read the Interaction | Make Your Points, Publication Pipeline, Understand a Paper |

---

*Reference generated from the codebase (`lib/modules.ts`, `lib/canvases.ts`, `lib/ai.ts`, `lib/reportGuide.ts`, and the room components). One module — a native-healthcare vendor-disclosure variant — is hidden and omitted.*
