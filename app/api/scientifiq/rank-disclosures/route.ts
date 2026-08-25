import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, rankDisclosuresAI } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError, scoreAbstract } from "@/lib/scientifiq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rank Our Disclosures — score a batch, rank by commercial potential, then the
// LLM writes the portfolio read (what to prioritize).
export async function POST(request: Request) {
  setFlow("rank-disclosures");
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured." }, { status: 503 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  // Each disclosure is a block separated by a line of "---".
  const blocks = String(body.text || "")
    .split(/\n\s*-{3,}\s*\n/)
    .map((b: string) => b.trim())
    .filter((b: string) => b.length >= 60)
    .slice(0, 12);
  if (blocks.length < 2) return Response.json({ error: "Paste at least two disclosures, separated by a line of ---." }, { status: 400 });

  try {
    const pct = (x: any) => Math.round((x?.raw ?? 0) * 100);
    const scored = await Promise.all(blocks.map(async (b: string) => {
      const firstLine = b.split("\n")[0].trim();
      const label = (firstLine.length > 4 && firstLine.length < 90 ? firstLine : b.slice(0, 60) + "…").replace(/\s+/g, " ");
      const s = await scoreAbstract(b);
      return { label, comm: pct(s.commercial), sci: pct(s.scientific), soc: pct(s.social), stars: { c: s.commercial?.stars ?? 0, s: s.scientific?.stars ?? 0, so: s.social?.stars ?? 0 } };
    }));
    scored.sort((a, b) => b.comm - a.comm);
    const read = await rankDisclosuresAI({ items: scored.map((x) => ({ label: x.label, comm: x.comm, sci: x.sci, soc: x.soc })) });
    return Response.json({ ranked: scored, read });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Failed to rank the disclosures." }, { status: 500 });
  }
}
