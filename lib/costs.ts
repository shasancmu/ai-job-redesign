// Rough AI cost model per module run — seed values the admin can tune on the
// cost page. A "run" = one full session's worth of AI calls. Token counts are
// estimates from each module's structure (interview turns + draft/analysis).
export type CostAssumption = { calls: number; inTok: number; outTok: number };

// Default token price (USD per 1M tokens). Editable on the page; seeded roughly
// at a Haiku-class model. Adjust to your actual provider/model.
export const DEFAULT_TOKEN_PRICE = { inPer1M: 1.0, outPer1M: 5.0 };

// Per-module assumptions: how many AI calls a run makes, and the average input /
// output tokens per call. Keyed by module slug.
export const COST_ASSUMPTIONS: Record<string, CostAssumption> = {
  // Paired + solo "reimagine" (interview ≈6 turns + a proposal)
  "reimagine-job": { calls: 8, inTok: 1600, outTok: 450 },
  "solo-ai": { calls: 8, inTok: 1600, outTok: 500 },
  // Workflow redesigns (interview + draw + analyze + tradeoffs + plan)
  "reimagine-workflow": { calls: 9, inTok: 1800, outTok: 600 },
  "workflow-solo": { calls: 10, inTok: 1800, outTok: 650 },
  // Strategy canvases (interview ≈6 + one large draft)
  "execution-4a": { calls: 7, inTok: 1600, outTok: 550 },
  "balanced-scorecard": { calls: 7, inTok: 1600, outTok: 600 },
  "ai-canvas": { calls: 7, inTok: 1700, outTok: 650 },
  "opportunity-capability": { calls: 7, inTok: 1600, outTok: 550 },
  "test-the-bet": { calls: 7, inTok: 1500, outTok: 500 },
  "good-business": { calls: 8, inTok: 1800, outTok: 700 },
  "deeptech-canvas": { calls: 8, inTok: 1900, outTok: 750 },
  // Career analyses
  "career-x-ray": { calls: 1, inTok: 4500, outTok: 2200 },
  "jd-x-ray": { calls: 1, inTok: 4500, outTok: 2200 },
  "career-roadmap": { calls: 6, inTok: 3000, outTok: 1200 }, // profile + targets + short interview
  // Negotiations (many short role-play turns + a debrief)
  "close-the-offer": { calls: 14, inTok: 900, outTok: 300 },
  "name-your-price": { calls: 12, inTok: 800, outTok: 260 },
  // Group tools (minimal AI)
  benchmark: { calls: 1, inTok: 500, outTok: 300 },
  network: { calls: 2, inTok: 700, outTok: 350 },
};

export function costPerRun(a: CostAssumption, price: { inPer1M: number; outPer1M: number }): number {
  const perCall = (a.inTok * price.inPer1M) / 1e6 + (a.outTok * price.outPer1M) / 1e6;
  return a.calls * perCall;
}

// Per-model token prices (USD per 1M tokens), for turning measured ai_events
// token counts into dollars. Cache reads are ~10% of input; cache writes ~125%.
// Update when Anthropic pricing changes. Matched by substring so date suffixes
// still resolve.
export const MODEL_PRICES: { match: string; inPer1M: number; outPer1M: number }[] = [
  { match: "haiku", inPer1M: 1.0, outPer1M: 5.0 },
  { match: "sonnet", inPer1M: 3.0, outPer1M: 15.0 },
  { match: "opus", inPer1M: 5.0, outPer1M: 25.0 },
  { match: "fable", inPer1M: 10.0, outPer1M: 50.0 },
  { match: "llama", inPer1M: 0.59, outPer1M: 0.79 }, // Groq Llama 3.3 70B, rough
];

export function priceForModel(model: string): { inPer1M: number; outPer1M: number } {
  const m = (model || "").toLowerCase();
  return MODEL_PRICES.find((p) => m.includes(p.match)) || DEFAULT_TOKEN_PRICE;
}

// Dollar cost of one ai_events row, honoring cache-read (0.1x) and cache-write
// (1.25x) pricing on the input side.
export function eventCost(ev: { model?: string | null; input_tokens?: number | null; output_tokens?: number | null; cache_read_tokens?: number | null; cache_write_tokens?: number | null }): number {
  const p = priceForModel(ev.model || "");
  const freshIn = Math.max(0, (ev.input_tokens || 0) - (ev.cache_read_tokens || 0) - (ev.cache_write_tokens || 0));
  const inCost = (freshIn * p.inPer1M + (ev.cache_read_tokens || 0) * p.inPer1M * 0.1 + (ev.cache_write_tokens || 0) * p.inPer1M * 1.25) / 1e6;
  const outCost = ((ev.output_tokens || 0) * p.outPer1M) / 1e6;
  return inCost + outCost;
}
