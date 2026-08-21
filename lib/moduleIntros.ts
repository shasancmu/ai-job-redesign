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
    { title: "What you'll leave with", body: "A clear read on where to lean in next. The useful part is what it surfaces about you, so we won't preview it." },
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
    { title: "What you'll leave with", body: "A clear read on how much of the bargaining zone you claimed. Better felt than spoiled." },
  ] },
  "rehearse-hard-conversation": { steps: [
    { title: "What you'll do", body: "Rehearse a hard conversation — a layoff, tough feedback, a denied promotion — against an AI who reacts like a real person." },
    { title: "Where it comes from", body: "Grounded in feedback science (situation–behavior–impact) and deliberate practice." },
    { title: "What you'll leave with", body: "A coach's read on how you handled it. The value is in doing it before it counts." },
  ] },
  "ai-board": { steps: [
    { title: "What you'll do", body: "Put a real decision in front of a board of AI advisors and watch them debate it — and each other." },
    { title: "Where it comes from", body: "Built on research about groupthink and the value of dissent and diverse perspectives in decisions." },
    { title: "What you'll leave with", body: "The strongest arguments on every side, surfaced. What they find is the point, so we won't preview it." },
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
};

export function getModuleIntro(m: ModuleDef): ModuleIntro {
  const bespoke = INTROS[m.slug];
  if (bespoke) return bespoke;
  // Non-spoiler fallback for modules without a bespoke intro.
  return {
    steps: [
      { title: "What you'll do", body: `${m.name} is a hands-on exercise run by AI — it interviews, partners with, or coaches you through your real situation, one step at a time.` },
      { title: "Grounded in research", body: "It's built on an established framework, not generic advice — the kind of thinking that holds up on a real decision." },
      { title: "What you'll leave with", body: "A concrete result you can act on. We won't spoil the insight here — you'll get more out of it by reaching it yourself." },
    ],
  };
}
