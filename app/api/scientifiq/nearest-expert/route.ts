import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, nearestExpertPlanAI } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError } from "@/lib/scientifiq";
import { nearestExperts } from "@/lib/nearestExpert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Problem + location -> a local / national / global ladder of scored experts.
export async function POST(request: Request) {
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const problem = String(body.problem || "").trim().slice(0, 1500);
  if (problem.length < 8) return Response.json({ error: "Describe your problem in a sentence or two." }, { status: 400 });
  const countryId = String(body.countryId || "").trim().slice(0, 8) || undefined;
  const countryName = String(body.countryName || "").trim().slice(0, 60) || undefined;
  const city = String(body.city || "").trim().slice(0, 80) || undefined;
  setFlow("nearest-expert");

  try {
    // Turn the problem into short topical search terms (short terms match far
    // better). Fall back to the raw problem if the AI step is unavailable.
    let plan: any = null;
    if (AI_ENABLED) plan = await nearestExpertPlanAI(problem).catch(() => null);
    const terms: string[] = Array.isArray(plan?.terms) && plan.terms.length ? plan.terms.map((t: any) => String(t)).slice(0, 3) : [problem.slice(0, 120)];

    const ladder = await nearestExperts({ queries: terms, countryId, countryName, city });
    if (!ladder.local.length && !ladder.national.length && !ladder.global.length) {
      return Response.json({ error: "No experts found. Try describing the underlying science more directly." }, { status: 404 });
    }
    return Response.json({ plan: { terms, areas: plan?.areas || [], framing: plan?.framing || "" }, ladder });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Failed to find experts." }, { status: 500 });
  }
}
