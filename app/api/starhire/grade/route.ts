import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, starHireGradeAI } from "@/lib/ai";
import { unsealScenario } from "@/lib/starhire/seal";
import { scoreCandidates, decisionScore } from "@/lib/starhire/value";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Grade the hire. Unseal the truth, score every candidate by the true-value
// model, compute the objective decision score, then let the AI grade the
// questions, reasoning, and calibration. The truth is revealed only now.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  const scn = unsealScenario(String(body.sealed || ""));
  if (!scn) return Response.json({ error: "This challenge's answer key is missing or invalid. Start a new one." }, { status: 400 });

  const pickId = String(body.pick?.id || "");
  const picked = scn.candidates.find((c) => c.id === pickId);
  if (!picked) return Response.json({ error: "Pick one of the candidates before submitting." }, { status: 400 });
  const pick = {
    id: pickId,
    name: picked.name,
    confidence: Math.max(0, Math.min(100, Number(body.pick?.confidence) || 0)),
    flip: String(body.pick?.flip || "").slice(0, 600),
  };
  setFlow("starhire:grade");

  const scored = scoreCandidates(scn);
  const best = [...scored].sort((a, b) => a.rank - b.rank)[0];
  const ds = decisionScore(scored, pickId);

  // format transcripts (chats: { candidateId: {role, content}[] })
  const chats = body.chats && typeof body.chats === "object" ? body.chats : {};
  const transcripts = scn.candidates
    .map((c) => {
      const msgs = Array.isArray(chats[c.id]) ? chats[c.id] : [];
      if (!msgs.length) return `### ${c.name} — (not interviewed)`;
      const lines = msgs.slice(0, 40).map((m: any) => `${m.role === "user" ? "Q" : "A"}: ${String(m.content || "").slice(0, 500)}`).join("\n");
      return `### ${c.name}\n${lines}`;
    })
    .join("\n\n");

  const byId = new Map(scored.map((s) => [s.id, s]));

  try {
    let report: any = null;
    if (AI_ENABLED) {
      report = await starHireGradeAI({
        firm: `${scn.firm.name} — ${scn.firm.oneLiner}`,
        role: `${scn.role.title}: ${scn.role.brief}`,
        roleWeights: scn.roleWeights,
        candidates: scn.candidates.map((c) => ({
          id: c.id, name: c.name, archetype: c.archetype, trueRank: byId.get(c.id)?.rank || 0, value: byId.get(c.id)?.value || 0,
          hc: c.hc, portableFraction: c.portableFraction, firmEffect: c.firmEffect, companyPrior: c.companyPrior, matchEffect: c.matchEffect, wage: c.wage, tailRisk: c.tailRisk, observedRating: c.observedRating, tell: c.tell,
        })),
        bestId: best.id, decisionScore: ds, pick, transcripts, principle: scn.principle,
      }).catch(() => null);
    }

    // Full reveal (truth is public now that the decision is locked).
    const truth = scn.candidates.map((c) => ({
      id: c.id, name: c.name, archetype: c.archetype, hc: c.hc,
      companyPrior: c.companyPrior, firmEffect: c.firmEffect, portableFraction: c.portableFraction,
      matchEffect: c.matchEffect, wage: c.wage, tailRisk: c.tailRisk, observedRating: c.observedRating, tell: c.tell,
      value: byId.get(c.id)?.value || 0, rank: byId.get(c.id)?.rank || 0, portableHc: byId.get(c.id)?.portableHc || 0,
    }));

    return Response.json({ decisionScore: ds, bestId: best.id, roleWeights: scn.roleWeights, principle: scn.principle, truth, pick, report });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Failed to grade the hire." }, { status: 500 });
  }
}
