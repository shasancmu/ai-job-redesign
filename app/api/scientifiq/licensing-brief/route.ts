import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, licensingBriefAI } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError, scoreAbstract, searchPapers, searchPatents } from "@/lib/scientifiq";

export const runtime = "nodejs";
import { setFlow } from "@/lib/aiflow";
export const dynamic = "force-dynamic";

// Licensing Brief — score an invention, pull comparable science and the nearby
// patent landscape (assignees = who's active), then the LLM writes the brief.
export async function POST(request: Request) {
  setFlow("licensing-brief");
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured." }, { status: 503 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  const abstract = String(body.abstract || "").trim().slice(0, 6000);
  const title = String(body.title || "").trim().slice(0, 300);
  const constraints = {
    licenseType: String(body.licenseType || "").slice(0, 40),
    sectors: String(body.sectors || "").slice(0, 200),
    stage: String(body.stage || "").slice(0, 40),
  };
  if (abstract.length < 80) return Response.json({ error: "Paste the invention's abstract or description (a few sentences)." }, { status: 400 });

  try {
    // Relevance-ordered comparables + patents (ordering by commPot would drop
    // relevance). The search query is the abstract itself (semantic).
    const query = abstract.slice(0, 400);
    const [scores, papersRes, patentsRes] = await Promise.all([
      scoreAbstract(abstract),
      searchPapers({ search: query, limit: 10 }).catch(() => ({ total: 0, papers: [] })),
      searchPatents({ search: query, limit: 8 }).catch(() => ({ total: 0, patents: [] })),
    ]);

    const num = (v: any) => (Number.isFinite(+v) ? +v : 0);
    const comparables = papersRes.papers.map((p) => ({
      id: p.id,
      title: p.title,
      year: p.year,
      comm: num(p.compot),
      authors: (p.researcherNames || []).map((a) => a.res_name).filter(Boolean).slice(0, 3).join(", "),
    }));
    const patents = patentsRes.patents.map((p) => ({
      id: p.id,
      title: p.title,
      year: p.year,
      assignees: (p.assigneeNames || []).slice(0, 3).join(", "),
    }));

    const brief = await licensingBriefAI({ abstract, title, constraints, scores, comparables, patents });
    if (!brief) return Response.json({ error: "Scored it but couldn't write the brief. Try again." }, { status: 502 });

    return Response.json({ scores, comparables, patents, brief, title });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Failed to build the brief." }, { status: 500 });
  }
}
