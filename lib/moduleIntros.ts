// A short, pedagogical "teaching moment" shown the first time someone opens a
// module: what they'll do, the research it's grounded in, and the payoff — WITHOUT
// giving away the insight. Bespoke intros for the flagship modules; a clean,
// non-spoiler fallback for everything else. All copy is original; frameworks are
// cited by name, not reproduced.

import type { ModuleDef } from "@/lib/modules";

export type IntroStep = { title: string; body: string };
export type ModuleIntro = { steps: IntroStep[] };

const INTROS: Record<string, ModuleIntro> = {
  "reimagine-job": { steps: [
    { title: "What you'll do", body: "Interview a partner (or an AI) about a real job, then redesign it — deciding what stays human and what AI can take off the plate." },
    { title: "Where it comes from", body: "Grounded in current research on how AI reshapes specific tasks and roles, and the economics of comparative advantage." },
    { title: "What you'll leave with", body: "A redesigned role you could actually propose — and a sharper sense of where your judgment becomes the point. We'll let the redesign surprise you." },
  ] },
  "career-x-ray": { steps: [
    { title: "What you'll do", body: "Paste your résumé and let an AI read your work, task by task, for where AI is already strong." },
    { title: "Where it comes from", body: "Built on task-based research into AI's impact on jobs — the lens economists use, pointed at your own career." },
    { title: "What you'll leave with", body: "A task-by-task read on where AI can take over and where your judgment becomes the point, specific to the work you put in." },
  ] },
  "business-consult": { steps: [
    { title: "What you'll do", body: "A 30-minute guided diagnostic: an AI advisor interviews you about how your business really works, and you rate a few things." },
    { title: "Where it comes from", body: "Grounded in the management-practices research of Bloom, Van Reenen & Sadun, plus classic 80/20 analysis." },
    { title: "What you'll leave with", body: "A prioritized plan — where your margin really lives and what to fix first. The 'aha' is in your own numbers, so we'll let you find it." },
  ] },
  "voice-consult": { steps: [
    { title: "What you'll do", body: "The 30-minute consult, hands-free — just talk with an AI advisor about how your business runs." },
    { title: "Where it comes from", body: "Grounded in the management-practices research of Bloom, Van Reenen & Sadun, plus 80/20 analysis." },
    { title: "What you'll leave with", body: "A prioritized plan — where the margin sits and what to fix first. We'll let the read surprise you." },
  ] },
  "define-vision": { steps: [
    { title: "What you'll do", body: "A guided conversation to put words to your organization's vision — what it stands for, why it exists, and where it's headed." },
    { title: "Where it comes from", body: "Grounded in the vision framework of Collins and Porras: an enduring core plus a bold envisioned future." },
    { title: "What you'll leave with", body: "Your vision written back to you, clear enough to pressure-test and share. The point is the clarity you reach together." },
  ] },
  "define-vision-voice": { steps: [
    { title: "What you'll do", body: "Talk it through, hands-free, while an AI facilitator draws out what your organization stands for and where it's going." },
    { title: "Where it comes from", body: "Grounded in the vision framework of Collins and Porras: an enduring core plus a bold envisioned future." },
    { title: "What you'll leave with", body: "A clear vision written up for you to sharpen and share." },
  ] },
  "close-the-offer": { steps: [
    { title: "What you'll do", body: "Negotiate a real, multi-issue offer live against an AI counterpart who has hidden priorities of their own." },
    { title: "Where it comes from", body: "Built on the integrative-bargaining tradition — the science of creating value by trading across issues, not just splitting the pie." },
    { title: "What you'll leave with", body: "A score and a coach's debrief on what you claimed and what you created. The lesson lands when you see your own result." },
  ] },
  "name-your-price": { steps: [
    { title: "What you'll do", body: "Haggle over a single price against an AI seller who has a hidden floor." },
    { title: "Where it comes from", body: "Built on distributive-bargaining research: anchoring, walk-aways (BATNA), and the zone of possible agreement." },
    { title: "What you'll leave with", body: "A clear read on how much of the bargaining zone you claimed." },
  ] },
  "rehearse-hard-conversation": { steps: [
    { title: "What you'll do", body: "Rehearse a hard conversation — a layoff, tough feedback, a denied promotion — against an AI who reacts like a real person." },
    { title: "Where it comes from", body: "Grounded in feedback science (situation–behavior–impact) and deliberate practice." },
    { title: "What you'll leave with", body: "A coach's read on how you handled it. The value is in doing it before it counts." },
  ] },
  "ai-board": { steps: [
    { title: "What you'll do", body: "Put a real decision in front of a board of AI advisors and watch them debate it — and each other." },
    { title: "Where it comes from", body: "Built on research about groupthink and the value of dissent and diverse perspectives in decisions." },
    { title: "What you'll leave with", body: "The strongest case for and against your decision, argued by a board of distinct advisors. What they say depends on the decision you bring." },
  ] },
  "personal-network": { steps: [
    { title: "What you'll do", body: "Map your real advice and trust relationships, inside and outside your organization." },
    { title: "Where it comes from", body: "Grounded in decades of network science — structural holes, weak ties, and brokerage (Burt, Granovetter, Cross)." },
    { title: "What you'll leave with", body: "A picture of where you actually sit in your network. It's often not where you'd guess." },
  ] },
  "find-superpower": { steps: [
    { title: "What you'll do", body: "An AI coach interviews you to find the strength you bring that others rely on." },
    { title: "Where it comes from", body: "Grounded in strengths-based development research." },
    { title: "What you'll leave with", body: "Your signature strength, named and made usable. The fun is in seeing it reflected back." },
  ] },
  "domain-brief": { steps: [
    { title: "What you'll do", body: "Point it at a research domain and an institution, and it maps who knows what and which science is closest to commercial use." },
    { title: "Where it comes from", body: "Built on large-scale bibliometric data and paper-to-patent citation research (Marx & Fuegi's Reliance on Science)." },
    { title: "What you'll leave with", body: "A scan of the expertise and the firms building on it. The interesting part is who shows up." },
  ] },

  "solo-ai": { steps: [
    { title: "What you'll do", body: "Let an AI interview you to find your real job — then hand you a redesign that offloads the busywork." },
    { title: "Where it comes from", body: "Grounded in research on how AI reshapes tasks, and the economics of comparative advantage." },
    { title: "What you'll leave with", body: "A redesigned role and a clearer sense of where only you add value. We'll let the redesign surprise you." },
  ] },
  "reimagine-workflow": { steps: [
    { title: "What you'll do", body: "Pick a real workflow and redraw it with a partner, step by step — deciding where people and AI each belong." },
    { title: "Where it comes from", body: "Grounded in research on task allocation and the tradeoffs of automation versus augmentation." },
    { title: "What you'll leave with", body: "A redesigned flow you could actually run. The interesting part is what the redraw reveals about who should do what." },
  ] },
  "workflow-solo": { steps: [
    { title: "What you'll do", body: "Describe a workflow and let AI interview you about it, then watch it redraw the flow." },
    { title: "Where it comes from", body: "Grounded in research on task allocation and where automation helps versus hurts." },
    { title: "What you'll leave with", body: "A redesign showing who should do what once AI and people share the work. The redraw is the payoff." },
  ] },
  "ai-canvas": { steps: [
    { title: "What you'll do", body: "Map one workflow to find where AI actually belongs — the human/AI split, the risks, and how to roll it out." },
    { title: "Where it comes from", body: "Grounded in research on augmentation versus automation and responsible AI adoption." },
    { title: "What you'll leave with", body: "A concrete plan for where AI fits and where it doesn't. The 'where' is the interesting part." },
  ] },
  "jd-x-ray": { steps: [
    { title: "What you'll do", body: "Paste a job description and see, task by task, which parts AI can already do." },
    { title: "Where it comes from", body: "Built on task-based research into AI's impact on jobs." },
    { title: "What you'll leave with", body: "A rewrite of the role as a human+AI job, and who to hire for it. The read on the role is the point." },
  ] },
  "career-roadmap": { steps: [
    { title: "What you'll do", body: "Tell an AI coach about your work and get your skill-adjacent next moves — lateral, step-up, and stretch." },
    { title: "Where it comes from", body: "Grounded in research on skills adjacency and career mobility." },
    { title: "What you'll leave with", body: "A map of realistic next moves and what each would take. The routes it surfaces are the fun part." },
  ] },
  "refresh-resume": { steps: [
    { title: "What you'll do", body: "Paste your résumé, and an AI coach interviews you about what you've actually accomplished this year." },
    { title: "Where it comes from", body: "Grounded in research on what makes a résumé specific and compelling — results stated in X-Y-Z form." },
    { title: "What you'll leave with", body: "The exact changes to make, in your own words to rewrite. The wins it draws out may surprise you." },
  ] },
  "refresh-resume-voice": { steps: [
    { title: "What you'll do", body: "Talk through your year, hands-free, while an AI coach draws out the wins worth putting on paper." },
    { title: "Where it comes from", body: "Grounded in research on what makes a résumé specific and compelling." },
    { title: "What you'll leave with", body: "The exact changes to make, in your own words. Just talk — it moves on when you pause." },
  ] },
  "career-myopia": { steps: [
    { title: "What you'll do", body: "An AI advisor interviews you about your career, then maps where the skills that made you successful might now hold you back." },
    { title: "Where it comes from", body: "Grounded in research on competency traps and career adaptability." },
    { title: "What you'll leave with", body: "The blind spots worth addressing, drawn from your own career rather than generic advice." },
  ] },
  "business-myopia": { steps: [
    { title: "What you'll do", body: "An AI advisor interviews you about your business, then maps where past success has quietly narrowed your view." },
    { title: "Where it comes from", body: "Grounded in research on competency traps and marketing myopia." },
    { title: "What you'll leave with", body: "The blind spots worth widening, drawn from your own business rather than a checklist." },
  ] },
  "good-business": { steps: [
    { title: "What you'll do", body: "An AI partner interviews you about a business you're weighing, then builds a rigorous analysis." },
    { title: "Where it comes from", body: "Grounded in Five Forces, VRIN, activity systems, and profit pools — plus real unit economics." },
    { title: "What you'll leave with", body: "A read on whether the market is attractive and your edge is durable, and what must be true to win. The verdict is yours to reach." },
  ] },
  "opportunity-capability": { steps: [
    { title: "What you'll do", body: "Test an opportunity against what you can actually do across your Tasks, People, Systems, and Culture." },
    { title: "Where it comes from", body: "Structured around organizational-capability research — the fit between an opportunity and your real capacity." },
    { title: "What you'll leave with", body: "An honest read on whether this bet fits you. The gap it exposes is usually the point." },
  ] },
  "test-the-bet": { steps: [
    { title: "What you'll do", body: "Turn a strategic belief into a clean, runnable experiment — the hypothesis, one metric, and a clear threshold." },
    { title: "Where it comes from", body: "Grounded in discovery-driven planning and assumption testing." },
    { title: "What you'll leave with", body: "A test you could actually run this week. Designing it well is the lesson." },
  ] },
  "execution-4a": { steps: [
    { title: "What you'll do", body: "Pressure-test a real initiative against four make-or-break conditions for getting things done." },
    { title: "Where it comes from", body: "Structured around the 4 A's of execution — Alignment, Ability, Architecture, and Agility." },
    { title: "What you'll leave with", body: "A candid score and where your plan is most likely to break. The weak link is rarely where you'd expect." },
  ] },
  "balanced-scorecard": { steps: [
    { title: "What you'll do", body: "Turn a strategy into objectives, measures, and initiatives across four connected perspectives." },
    { title: "Where it comes from", body: "Built on the Balanced Scorecard (Kaplan & Norton)." },
    { title: "What you'll leave with", body: "A scorecard that links what you do to the results you want. Seeing the strategy cohere is the payoff." },
  ] },
  "deeptech-canvas": { steps: [
    { title: "What you'll do", body: "Separate a deep-tech venture's technical uncertainty from its market uncertainty, then design one experiment." },
    { title: "Where it comes from", body: "Grounded in research on managing technical and market risk in deep-tech ventures." },
    { title: "What you'll leave with", body: "The single test that would de-risk the venture most. Which uncertainty dominates is often surprising." },
  ] },
  "customer-empathy": { steps: [
    { title: "What you'll do", body: "Send a potential customer one link; an AI runs a warm, curious interview and comes back with what they really need." },
    { title: "Where it comes from", body: "Built on the design-thinking empathy method and Jobs-to-be-Done." },
    { title: "What you'll leave with", body: "An empathy profile and the unmet needs to build for. The signal is in their own words." },
  ] },
  "ask-for-a-raise": { steps: [
    { title: "What you'll do", body: "Negotiate your own pay and package live against an AI manager — raise, title, remote, and more, all at once." },
    { title: "Where it comes from", body: "Built on the integrative-bargaining tradition: create value by trading across issues, not just pushing on the number." },
    { title: "What you'll leave with", body: "A score and a coach's debrief on where you traded well. The lesson lands in your own result." },
  ] },
  "close-the-vendor-deal": { steps: [
    { title: "What you'll do", body: "Negotiate a software contract live against an AI account exec — price, term, payment, support, and more." },
    { title: "Where it comes from", body: "Built on the integrative-bargaining tradition: trade the terms they value for the ones you do." },
    { title: "What you'll leave with", body: "A score and a debrief on the value you claimed and created." },
  ] },
  "lease-the-space": { steps: [
    { title: "What you'll do", body: "Haggle over a monthly office rent against an AI landlord who has a hidden floor." },
    { title: "Where it comes from", body: "Built on distributive-bargaining research: anchoring, walk-aways (BATNA), and the zone of possible agreement." },
    { title: "What you'll leave with", body: "A clear read on how much of the bargaining zone you claimed." },
  ] },
  "benchmark": { steps: [
    { title: "What you'll do", body: "Take a short, timed reasoning test — then see how you did against the whole room, and against AI on the same questions." },
    { title: "Where it comes from", body: "Built on research comparing human and machine reasoning across tasks." },
    { title: "What you'll leave with", body: "An honest read on where humans still have the edge. We'll let the scoreboard speak for itself." },
  ] },
  "network": { steps: [
    { title: "What you'll do", body: "Answer a few quick, anonymous questions about who you turn to — and the room's real network draws itself, live." },
    { title: "Where it comes from", body: "Grounded in network science: centrality, weak ties, and how influence actually flows (Granovetter, Burt, Cross)." },
    { title: "What you'll leave with", body: "A vivid picture of how the room is really connected. Who's central is often a surprise." },
  ] },
  "vendor-disclosure": { steps: [
    { title: "What you'll do", body: "Send a vendor one open link; they complete a structured disclosure, and AI scores it for you." },
    { title: "Where it comes from", body: "Adapted from the Health AI Partnership vendor-disclosure framework." },
    { title: "What you'll leave with", body: "The gaps and red flags to catch before you buy. We'll let the scoring surface them." },
  ] },
  "haip-disclosure": { steps: [
    { title: "What you'll do", body: "Send a healthcare AI vendor one link; they complete a full disclosure, and AI reviews it against the framework." },
    { title: "Where it comes from", body: "Built on the Health AI Partnership (HAIP) AI Vendor Disclosure Framework." },
    { title: "What you'll leave with", body: "A structured read on the vendor's claims and gaps, before a purchase decision." },
  ] },
  "find-collaborators": { steps: [
    { title: "What you'll do", body: "Describe your research and find the people at your institution whose work complements yours." },
    { title: "Where it comes from", body: "Built on co-authorship and complementarity analysis over large bibliometric data." },
    { title: "What you'll leave with", body: "A shortlist of who to talk to, including the non-obvious ones. Who shows up is the interesting part." },
  ] },
  "licensing-brief": { steps: [
    { title: "What you'll do", body: "Paste a disclosure or abstract and get a decision-ready brief on the technology's commercial potential." },
    { title: "Where it comes from", body: "Built on models of commercial and scientific potential over large research and patent datasets." },
    { title: "What you'll leave with", body: "A read on where the technology could go and who might license it. The assessment is the payoff." },
  ] },
};

// Explainer lessons (How AI works, The PhD path) teach as you read them, so a
// pop-up intro is just noise — they get no intro at all.
const LESSON_EXERCISES = new Set([
  "ai-rules", "ai-learning", "ai-language", "ai-scale",
  "phd-what", "phd-choose", "phd-apply", "phd-structure", "phd-succeed", "phd-placement",
]);

export function getModuleIntro(m: ModuleDef): ModuleIntro {
  const bespoke = INTROS[m.slug];
  if (bespoke) return bespoke;
  if (LESSON_EXERCISES.has(m.exercise)) return { steps: [] };
  // For everything else without a bespoke intro, a single short card built from
  // the module's own tagline — specific to the exercise, not boilerplate.
  return { steps: [{ title: "Before you start", body: m.tagline }] };
}
