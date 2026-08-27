import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, roleplayExaminerAI } from "@/lib/ai";
import { getAnalyticalSpec } from "@/lib/mechanics/analyticalStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// Decompose the subject into units and score each against the author's levels.
// Scoring is deterministic from the level values; the AI only classifies.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const spec = await getAnalyticalSpec(String(body.slug || ""));
  if (!spec) return Response.json({ error: "unknown instrument" }, { status: 400 });
  const input = String(body.input || "").slice(0, 8000);
  if (!input) return Response.json({ error: "Nothing to analyze." }, { status: 400 });
  setFlow(`analytical:${spec.slug}:run`);

  const levelList = spec.levels.map((l) => `- ${l.key} (${l.label}): ${l.desc}`).join("\n");
  const system = `You are an analytical instrument named "${spec.name}". You analyze ${spec.subject}. Decompose it into ${spec.unitLabel}s, then classify EACH into exactly one level.
Decompose like this: ${spec.decompose}
${spec.lens ? `Apply this lens rigorously: ${spec.lens}\n` : ""}The levels (use the KEY):
${levelList}
Output ONLY JSON: {"units":[{"label":"the ${spec.unitLabel}","level":"<one level key>","note":"one short reason"}],"summary":"2-3 sentences on the overall picture"}. Produce 5 to 15 units. Be specific and grounded in the input; never invent content not implied by it. No em dashes.`;

  try {
    const out = await roleplayExaminerAI(system, input, 2500);
    if (!out?.units) return Response.json({ error: "Couldn't analyze. Try again." }, { status: 502 });
    const valueOf: Record<string, number> = {}; for (const l of spec.levels) valueOf[l.key] = l.value;
    const units = (out.units as any[]).filter((u) => u && u.label).map((u) => ({ label: String(u.label), level: valueOf[u.level] != null ? u.level : spec.levels[0].key, note: String(u.note || "") }));
    const vals = units.map((u) => valueOf[u.level] ?? 0);
    const aggregate = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    return Response.json({ units, aggregate, summary: String(out.summary || ""), levels: spec.levels, aggregateLabel: spec.aggregateLabel });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Analysis failed." }, { status: 500 });
  }
}
