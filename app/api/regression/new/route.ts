import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, regressionDgpAI } from "@/lib/ai";
import { sanitizeDgp } from "@/lib/regsim/sanitize";
import { simulate, toChallenge } from "@/lib/regsim/simulate";
import { sealDgp } from "@/lib/regsim/seal";
import type { Dgp } from "@/lib/regsim/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIFF = new Set(["easy", "hard"]);

// Mint a fresh challenge: the AI invents a DGP for the chosen context+difficulty,
// code simulates the data, and the answer key is sealed (encrypted) so it can
// ride in the student's workspace without being readable.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const context = (String(body.context || "").trim().slice(0, 60)) || "business analytics";
  const difficulty: "easy" | "hard" = DIFF.has(body.difficulty) ? body.difficulty : "easy";
  setFlow(`regression:new:${difficulty}`);

  const seed = Math.floor(Math.random() * 2147483647);
  const n = difficulty === "easy" ? 450 : 400;

  try {
    let dgp: Dgp | null = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 2 && !dgp; attempt++) {
      const raw = await regressionDgpAI({ context, difficulty });
      const san = sanitizeDgp(raw, { context, difficulty, seed, n });
      if ("dgp" in san) dgp = san.dgp;
      else lastErr = san.error;
    }
    if (!dgp) return Response.json({ error: lastErr || "Couldn't design a valid challenge. Try again." }, { status: 502 });

    const { columns } = simulate(dgp);
    const challenge = toChallenge(dgp, columns);
    const sealed = sealDgp(dgp);
    return Response.json({ challenge, sealed });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Failed to generate a challenge." }, { status: 500 });
  }
}
