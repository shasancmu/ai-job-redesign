import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, scoreInventionAI } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError, scoreAbstract } from "@/lib/scientifiq";
import { scoreText } from "@/lib/sciscore";
import { isDirectorOrAdmin } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Score My Invention — score an abstract for commercial/scientific/social
// potential, then the LLM reads the scores and says how to raise them.
export async function POST(request: Request) {
  setFlow("score-invention");
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured." }, { status: 503 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const abstract = String(body.abstract || "").trim().slice(0, 6000);
  const title = String(body.title || "").trim().slice(0, 300);
  if (abstract.length < 80) return Response.json({ error: "Paste your invention or idea as an abstract (a few sentences)." }, { status: 400 });

  try {
    const isDir = await isDirectorOrAdmin(user);
    const scores = await scoreAbstract(abstract);
    // The three new potentials from the sciscore models (defense only for
    // directors). Null-safe: if the model service is down they're just omitted.
    const [cplx, intd, def] = await Promise.all([
      scoreText("complex_invention", abstract),
      scoreText("interdisciplinary", abstract),
      isDir ? scoreText("defense_impact", abstract) : Promise.resolve(null),
    ]);
    const extra: Record<string, number> = {};
    if (cplx) extra.complex_invention = Math.round(cplx.score * 100);
    if (intd) extra.interdisciplinary = Math.round(intd.score * 100);
    if (isDir && def) extra.defense = Math.round(def.score * 100);
    const read = await scoreInventionAI({ abstract, title, scores });
    if (!read) return Response.json({ error: "Scored it but couldn't write the read. Try again." }, { status: 502 });
    return Response.json({ scores, extra, read, title });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Failed to score the invention." }, { status: 500 });
  }
}
