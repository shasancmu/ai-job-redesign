import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, incentiveScenarioAI } from "@/lib/ai";
import { sanitizeScenario } from "@/lib/incentive/sanitize";
import { sealScenario } from "@/lib/incentive/seal";
import { firmOptimum, bestAchievableDesign, bestResponse } from "@/lib/incentive/model";
import type { HiddenScenario, ObservableScenario } from "@/lib/incentive/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DIFF = new Set(["easy", "hard"]);

// Mint an incentive-design challenge. Reject scenarios that aren't teachable:
// there must be a real gap between a naive design (gets gamed) and the best
// achievable design (aligns effort with true value).
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const context = (String(body.context || "").trim().slice(0, 60)) || "a frontline service operation";
  const difficulty: "easy" | "hard" = DIFF.has(body.difficulty) ? body.difficulty : "easy";
  setFlow(`incentive:new:${difficulty}`);

  try {
    let hidden: HiddenScenario | null = null;
    let observable: ObservableScenario | null = null;
    let optimum = 0;
    let bestDesign = 0;
    let lastErr = "not teachable";
    for (let attempt = 0; attempt < 3 && !hidden; attempt++) {
      const raw = await incentiveScenarioAI({ context, difficulty });
      const san = sanitizeScenario(raw, { context, difficulty });
      if ("error" in san) { lastErr = san.error; continue; }
      const opt = firmOptimum(san.hidden).eval.trueValue;
      const best = bestAchievableDesign(san.hidden).trueValue;
      // the worst obvious (single-metric) design — the trap must be real
      const worstSolo = Math.min(...san.hidden.metrics.map((m) => bestResponse(san.hidden, { weights: { [m.key]: 100 } }).eval.trueValue));
      if (opt >= 45 && best >= 0.8 * opt && best - worstSolo >= 20) {
        hidden = san.hidden; observable = san.observable; optimum = opt; bestDesign = best;
      } else {
        lastErr = `scenario not teachable (opt ${opt.toFixed(0)}, best ${best.toFixed(0)}, worst ${worstSolo.toFixed(0)})`;
      }
    }
    if (!hidden || !observable) return Response.json({ error: lastErr }, { status: 502 });
    return Response.json({ scenario: observable, sealed: sealScenario(hidden), par: { optimum: Math.round(optimum), best: Math.round(bestDesign) } });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Failed to generate a scenario." }, { status: 500 });
  }
}
