import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError } from "@/lib/scientifiq";
import { isDirectorOrAdmin } from "@/lib/orgs";
import { optimizeImpact, OPTIMIZE_TARGETS, type Target } from "@/lib/impactOptimizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Impact Optimizer — what science is missing for this abstract to reach a target
// potential. The AI proposes scientific extensions; the models score them; we rank
// the missing pieces. Defense target is director-only.
export async function POST(request: Request) {
  setFlow("impact-optimizer");
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured." }, { status: 503 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const abstract = String(body.abstract || "").trim().slice(0, 6000);
  const target = String(body.target || "commercial") as Target;
  const rawLevel = Number(body.targetLevel);
  const targetLevel = Number.isFinite(rawLevel) && rawLevel > 0 ? Math.max(1, Math.min(100, Math.round(rawLevel))) : undefined;
  if (abstract.length < 80) return Response.json({ error: "Paste the research as an abstract (a few sentences)." }, { status: 400 });
  if (!OPTIMIZE_TARGETS.includes(target)) return Response.json({ error: "Unknown target." }, { status: 400 });
  const canDefense = await isDirectorOrAdmin(user);
  if (target === "defense" && !canDefense) return Response.json({ error: "Defense target is for directors." }, { status: 403 });

  try {
    const result = await optimizeImpact(abstract, target, { includeDefense: canDefense, targetLevel });
    if (!result.steps.length && !Object.keys(result.baseline).length) return Response.json({ error: "Couldn't score the abstract. Try again." }, { status: 502 });
    return Response.json(result);
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Optimization failed." }, { status: 500 });
  }
}
