import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, starHireScenarioAI } from "@/lib/ai";
import { sanitizeScenario } from "@/lib/starhire/sanitize";
import { sealScenario } from "@/lib/starhire/seal";
import type { HiddenScenario, ObservableScenario } from "@/lib/starhire/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DIFF = new Set(["easy", "hard"]);

// Mint a hiring challenge: the AI invents a firm, role, and candidate slate; the
// observable profiles go to the student and the hidden truth is sealed.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const context = (String(body.context || "").trim().slice(0, 60)) || "a professional services firm";
  const difficulty: "easy" | "hard" = DIFF.has(body.difficulty) ? body.difficulty : "easy";
  setFlow(`starhire:new:${difficulty}`);

  try {
    let hidden: HiddenScenario | null = null;
    let observable: ObservableScenario | null = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 2 && !hidden; attempt++) {
      const raw = await starHireScenarioAI({ context, difficulty });
      const san = sanitizeScenario(raw, { context, difficulty });
      if ("error" in san) { lastErr = san.error; continue; }
      hidden = san.hidden;
      observable = san.observable;
    }
    if (!hidden || !observable) return Response.json({ error: lastErr || "Couldn't design a valid scenario. Try again." }, { status: 502 });
    return Response.json({ scenario: observable, sealed: sealScenario(hidden) });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Failed to generate a scenario." }, { status: 500 });
  }
}
