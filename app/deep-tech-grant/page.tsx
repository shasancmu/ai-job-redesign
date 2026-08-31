import type { Metadata } from "next";
import type { Slide } from "@/lib/deckTypes";
import DeckPresenter from "@/components/DeckPresenter";

// A fixed, code-defined presentation (not a saved deck) at /deep-tech-grant.
// Authored as native Slide[] so it renders through the app's own DeckPresenter —
// same styling, nav, and feel as every other presentation on the app.
export const metadata: Metadata = { title: "Scientifiq DeepTech — Superadditive" };

const SLIDES: Slide[] = [
  {
    id: "s1", type: "title",
    title: "DeepTech Intelligence",
    subtitle: "A research engine that doesn't just score science — it proposes the science worth doing.  ·  Superadditive × Scientifiq.AI",
  },
  {
    id: "s2", type: "cards",
    title: "Three layers, one loop — measure → explain → generate",
    cards: [
      { icon: "📐", heading: "L1 · Measure the potential", text: "Learned models read an abstract and predict its commercial, scientific, social, defense, complex-invention and interdisciplinary potential — the substrate everything scores against." },
      { icon: "🕸️", heading: "L2 · Explain the ecosystem", text: "Modules turn scores into decisions — invention fingerprints, licensing briefs, a research agent, and network-graph exploration of the innovation ecosystem." },
      { icon: "⚗️", heading: "L3 · Generate the science", text: "The Impact Optimizer searches over the models to find what's missing from the science for a paper to reach a target — and now learns a value network to do it better." },
    ],
  },
  {
    id: "s3", type: "cards",
    title: "The foundation — three potential models, scored in [0,1]",
    cards: [
      { icon: "🏭", heading: "Commercial", text: "How likely industry is to build on the work — patent uptake." },
      { icon: "📚", heading: "Scientific", text: "How likely it is to draw academic citations." },
      { icon: "🌍", heading: "Social", text: "Its potential for societal benefit. Delivered live from Scientifiq's /sandbox." },
    ],
  },
  {
    id: "s4", type: "bullets",
    title: "sciscore — a model factory",
    bullets: [
      "Freeze SciBERT → mean-pool to a 768-dim vector (a rich scientific representation, no training)",
      "Fit a light head on the frozen vectors — logistic for yes/no, ridge for continuous",
      "A task is just a YAML file; labels are weak-labeled from BigQuery — ~10k rows suffice",
      "Ship on Cloud Run, scale-to-zero — a live /score API",
      "The recipe: text → SciBERT (768-d) → linear head → 0–1 score. Any target ~ raw text, deployed in an afternoon.",
    ],
  },
  {
    id: "s5", type: "barlist",
    title: "Three targets nobody was scoring",
    subtitle: "New models · held-out AUROC",
    bars: [
      { label: "Defense Impact", value: 0.897, hint: "P( a defense-assigned patent cites it )", group: 0 },
      { label: "Complex-Invention", value: 0.874, hint: "feeds complex, multi-disciplinary tech", group: 1 },
      { label: "Interdisciplinary", value: 0.754, hint: "influence beyond its own field", group: 2 },
    ],
  },
  {
    id: "s6", type: "cards",
    title: "Local surrogate scorers — the self-play unlock",
    cards: [
      { icon: "⚡", heading: "Fast, free, in-process", text: "A stand-in for the ~3s live scorer. Bulk self-play needs millions of scores the sandbox can't serve — this has no network and no rate limit." },
      { icon: "🧪", heading: "Distilled from the corpus", text: "Trained on real (abstract, pub_compot / pub_scipot) pairs — free labels for 30M papers. R² 0.49 / 0.39 — a peer of the sandbox's own fit (r ≈ 0.72), not a degraded copy." },
    ],
  },
  {
    id: "s7", type: "cards",
    title: "From scores to decisions — the module suite",
    cards: [
      { icon: "🔬", heading: "Score My Invention", text: "Paste an invention → a 6-dimension potential fingerprint." },
      { icon: "📄", heading: "Licensing Brief", text: "Scores, comparables, and the surrounding patent landscape." },
      { icon: "🧭", heading: "Research Agent", text: "Ask questions; answers grounded in the 30M-paper corpus." },
      { icon: "🕸️", heading: "Ecosystem Explorer", text: "Interactive network graphs of the innovation ecosystem." },
      { icon: "📊", heading: "Batch Scorer", text: "Score whole portfolios of abstracts at once. (directors)" },
      { icon: "🛡️", heading: "Defense Impact", text: "The defense-relevance screen, on demand. (directors)" },
    ],
  },
  {
    id: "s8", type: "bullets",
    title: "The Impact Optimizer — measuring → generating",
    bullets: [
      "Finds what's missing from the SCIENCE for a paper to reach a target — not rewording",
      "Proposes real work to do next: a demo at scale, a new application, a missing mechanism",
      "The models become a compass: which next move most raises impact, ranked and grounded",
      "The four ideas that follow all live inside this one module",
    ],
  },
  {
    id: "s9", type: "cards",
    title: "Idea 01 · Decision Transformer — condition on the outcome",
    cards: [
      { icon: "🎯", heading: "The idea", text: "Set a target score; the model generates the research path that reaches it — steering by conditioning, not a blind hill-climb." },
      { icon: "⚙️", heading: "Under the hood", text: "state = abstract, action = a scientific extension. Condition on return-to-go (goal − current), shrinking each step; terminate when the goal is hit. From RL-as-sequence-modeling." },
    ],
  },
  {
    id: "s10", type: "cards",
    title: "Idea 02 · GFlowNet — a portfolio of bets",
    cards: [
      { icon: "🎲", heading: "The idea", text: "A single 'optimal' path over-fits. Return a spread of genuinely different high-impact bets — a funder's portfolio, not one route." },
      { icon: "⚙️", heading: "Under the hood", text: "A wide beam selected by reward − diversity (MMR), so the search can't collapse onto one template. Each bet carries a trade-off signature: its net effect on every other potential." },
    ],
  },
  {
    id: "s11", type: "cards",
    title: "Idea 03 · AlphaFold-style twin-grounding",
    cards: [
      { icon: "🧬", heading: "The idea", text: "Read co-variation across a paper's real research twins — the answer to 'is this legit science?' with evidence, not speculation." },
      { icon: "⚙️", heading: "Under the hood", text: "Retrieve the 24 closest semantic twins; split by outcome; read off the factors that separate the winners. Ground each bet in real matched papers that made the same move." },
    ],
  },
  {
    id: "s12", type: "cards",
    title: "Idea 04 · AlphaZero — a value network for research  (training now)",
    cards: [
      { icon: "♟️", heading: "The idea", text: "Judge a position by its eventual outcome, not the board now. V(abstract) predicts the reachable ceiling; the gap V − current is untapped headroom — which papers are worth optimizing." },
      { icon: "⚙️", heading: "Under the hood", text: "A SciBERT → ridge head (the sciscore recipe) trained on self-play returns. Guides the beam by ceiling, not present value. 0 inference tokens. Status: a 1500-root self-play sweep is running." },
    ],
  },
  {
    id: "s13", type: "bullets",
    title: "Self-play makes its own training data",
    bullets: [
      "The optimizer IS the game: propose → score → extend generates labeled trajectories for free",
      "The value-to-go label is the realized return along each trajectory",
      "Fully local & free: the surrogate scorer + a local LLM on the M5 → zero API cost, no rate limits",
      "The flywheel: v1 guides better rollouts → better data → v2. Policy and value bootstrap each other.",
    ],
  },
  {
    id: "s14", type: "cards",
    title: "The frontier roadmap",
    cards: [
      { icon: "🌐", heading: "MuZero", text: "Learn a latent dynamics model of how a research state evolves under an extension. Plan in latent space — a simulator of science you can roll out counterfactually." },
      { icon: "🧬", heading: "Research-MSA", text: "A model over whole twin families that predicts the causal levers — which scientific choices actually move outcomes." },
      { icon: "🔮", heading: "Impact-Graph", text: "Predict the downstream graph from the abstract: who, which industries, and when will build on the result." },
    ],
  },
  {
    id: "s15", type: "cards",
    title: "Built to be trusted",
    cards: [
      { icon: "🗄️", heading: "Data", text: "30M abstracts + potentials · Reliance-on-Science paper→patent · PatentsView · OpenAlex." },
      { icon: "✅", heading: "Validation", text: "Held-out AUROC / R² · bias audit (no small-institution penalty) · calibration (ECE ≤ 5%)." },
      { icon: "☁️", heading: "Serving", text: "FastAPI /score · Cloud Run, scale-to-zero · modular — one API, many tasks." },
    ],
  },
  {
    id: "s16", type: "text",
    title: "A research operating system.",
    body: "Measure the potential. Explain the ecosystem. Generate the missing science. Optimize the path. Then learn from every run — and do it again, better.\n\nmeasure → explain → generate → optimize → learn ↺",
  },
];

export default function DeepTechGrantPage() {
  return <DeckPresenter slides={SLIDES} exitHref="/" />;
}
