import type { Metadata } from "next";
import type { Slide } from "@/lib/deckTypes";
import DeckPresenter from "@/components/DeckPresenter";

// A fixed, code-defined presentation at /deep-tech-grant, authored as native Slide[]
// so it renders through the app's own DeckPresenter — same styling, nav, and feel as
// every other deck on the app. Narrative: motivation → Scientifiq.AI core & APIs →
// the potential measures → the Superadditive modules (what each does, how it pulls
// data, the problem it solves, and for whom).
export const metadata: Metadata = { title: "Scientifiq DeepTech — Superadditive" };

const SLIDES: Slide[] = [
  // ── Motivation ──────────────────────────────────────────────────────────
  {
    id: "s1", type: "title",
    title: "DeepTech Intelligence",
    subtitle: "Reading the potential of science — and acting on it.  ·  Superadditive × Scientifiq.AI",
  },
  {
    id: "s2", type: "text",
    title: "The problem",
    body:
      "The world spends trillions on R&D every year. Yet which science will matter — commercially, scientifically, for society, for security — is still judged one paper at a time, by expert intuition that doesn't scale.\n\n" +
      "High-potential work goes unseen. Funding and attention follow reputation, not signal. The gap between a result and its eventual impact is enormous — and mostly invisible.",
  },
  {
    id: "s3", type: "quote",
    quote: "What if you could read the potential of any idea the moment it is written?",
    attribution: "— the premise of everything that follows",
  },

  // ── At the core: Scientifiq.AI ──────────────────────────────────────────
  {
    id: "s4", type: "cards",
    title: "At the core: Scientifiq.AI — what the APIs do",
    cards: [
      { icon: "🔎", heading: "Semantic search", text: "Find any paper, patent, researcher, or grant by meaning — not keywords — across the research graph." },
      { icon: "📈", heading: "Potential scoring", text: "Score any abstract for its potential in seconds — the predictive signal, from the text alone." },
      { icon: "🗄️", heading: "The data lake", text: "30M+ abstracts with real outcomes — citations, patent uptake — in BigQuery. The substrate the models learn from." },
    ],
  },

  // ── The potential measures ──────────────────────────────────────────────
  {
    id: "s5", type: "cards",
    title: "The potential measures — six signals, and what each reads",
    cards: [
      { icon: "🏭", heading: "Commercial", text: "Will industry build on it? — patent uptake. (Scientifiq)" },
      { icon: "📚", heading: "Scientific", text: "Will it draw academic citations? (Scientifiq)" },
      { icon: "🌍", heading: "Social", text: "Its potential for societal benefit. (Scientifiq)" },
      { icon: "🛡️", heading: "Defense · new", text: "Relevance to national security — will a defense-assigned patent cite it?" },
      { icon: "🧩", heading: "Complex-Invention · new", text: "Does it feed complex, multi-disciplinary technology?" },
      { icon: "🔗", heading: "Interdisciplinary · new", text: "Does its influence reach beyond its own field?" },
    ],
  },
  {
    id: "s6", type: "bullets",
    title: "How a measure is built",
    bullets: [
      "Freeze SciBERT → a 768-dim vector straight from the text (no training)",
      "Fit a light head on real outcomes, weak-labeled from BigQuery — ~10k examples is enough",
      "Any 'target ~ raw text' becomes a live model in an afternoon — that modularity is the asset",
      "Validated held-out: AUROC 0.75–0.90 · bias-audited (no small-institution penalty) · calibrated",
      "Served on Cloud Run behind the same /score API Scientifiq exposes",
    ],
  },

  // ── Superadditive.app builds the modules ────────────────────────────────
  {
    id: "s7", type: "text",
    title: "Superadditive.app — from signal to decisions",
    body:
      "Scientifiq gives the signal. Superadditive builds the modules that turn it into decisions people can act on.\n\n" +
      "Each module is a job to be done — pulling live from the search and scoring APIs, and answering one question for one kind of user.",
  },
  {
    id: "s8", type: "bullets",
    title: "Module · Score My Invention",
    bullets: [
      "What it does — paste an invention or abstract; get a 6-dimension potential fingerprint in seconds",
      "How it pulls data — calls Scientifiq's scoring API across all six measures on the text",
      "The problem — is this worth pursuing, and what kind of impact does it have?",
      "For whom — researchers, inventors, and tech-transfer offices triaging ideas",
    ],
  },
  {
    id: "s9", type: "bullets",
    title: "Module · Licensing Brief",
    bullets: [
      "What it does — generates a scouting brief: the scores, comparable work, and the surrounding patent landscape, written up",
      "How it pulls data — scoring API + semantic search for comparables + patent search for the landscape + an AI summary",
      "The problem — should we patent or license this, and who would want it?",
      "For whom — tech-transfer and licensing officers, corporate scouts",
    ],
  },
  {
    id: "s10", type: "bullets",
    title: "Module · Research Agent",
    bullets: [
      "What it does — ask a question; get an answer grounded in the corpus, with the papers behind it",
      "How it pulls data — semantic search over 30M+ papers, synthesized by AI",
      "The problem — what does the literature actually say, fast and grounded?",
      "For whom — researchers, analysts, and students navigating a field",
    ],
  },
  {
    id: "s11", type: "bullets",
    title: "Module · Ecosystem Explorer",
    bullets: [
      "What it does — draw and explore the network of a field: who connects to whom, what feeds what",
      "How it pulls data — relationship data from BigQuery (co-authorship, citations, paper→patent links) as an interactive graph",
      "The problem — what is the structure of this innovation ecosystem, and where are the hubs?",
      "For whom — R&D strategists, funders, investors, and policymakers",
    ],
  },
  {
    id: "s12", type: "cards",
    title: "Modules · the operator tools",
    cards: [
      { icon: "📊", heading: "Batch Scorer", text: "Score a whole portfolio of abstracts at once. Pulls the scoring API over an upload. For funders and directors triaging hundreds of papers." },
      { icon: "🛡️", heading: "Defense Impact", text: "Screen work for national-security relevance. Runs the defense-impact model on the text. For defense / government scouts and dual-use analysts." },
    ],
  },
  {
    id: "s13", type: "bullets",
    title: "Module · Impact Optimizer",
    bullets: [
      "What it does — finds what's missing from the SCIENCE for a paper to reach a target potential: concrete next experiments and applications, ranked",
      "How it pulls data — the scoring models as the oracle + an AI proposer + semantic search for real precedent and twin papers",
      "The problem — how do we make this work more impactful — not reword it, but improve the science?",
      "For whom — PIs, program managers, and funders shaping what to work on next",
    ],
  },
  {
    id: "s14", type: "bullets",
    title: "Impact Optimizer — how it works",
    bullets: [
      "A self-play search: the AI proposes scientific extensions; the models score each; the highest-ceiling paths survive",
      "Returns a portfolio of genuinely distinct research bets, each with its trade-offs across the other measures",
      "Every suggestion grounded in real matched papers that made the same move — evidence, not speculation",
      "A value network (in training) predicts each paper's reachable ceiling — its untapped headroom",
    ],
  },

  // ── Where it's going & who it's for ─────────────────────────────────────
  {
    id: "s15", type: "cards",
    title: "What's next",
    cards: [
      { icon: "♟️", heading: "Value network — live", text: "Guide the search by reachable ceiling, and give every paper a 'headroom' triage score. (training now)" },
      { icon: "🌐", heading: "Latent planning", text: "Learn how research evolves and plan in latent space — a simulator of science, rolled out counterfactually." },
      { icon: "🔮", heading: "Impact graph", text: "Predict the downstream graph from the abstract: who, which industries, and when will build on a result." },
    ],
  },
  {
    id: "s16", type: "text",
    title: "Who it's for",
    body:
      "Researchers, tech-transfer offices, funders, investors, policymakers, and defense scouts — anyone who has to decide which early-stage science is worth their attention.\n\n" +
      "Read the potential. Explain the ecosystem. Generate the missing science. Act with signal, not guesswork.",
  },
];

export default function DeepTechGrantPage() {
  return <DeckPresenter slides={SLIDES} exitHref="/" />;
}
