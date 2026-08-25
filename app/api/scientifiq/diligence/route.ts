import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, diligenceScienceAI } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError, scoreAbstract, searchPapers, searchPatents } from "@/lib/scientifiq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diligence the Science — score a claimed technology, pull comparable science
// and the patent landscape, then the LLM reads whether the science is real,
// strong, and commercializing.
export async function POST(request: Request) {
  setFlow("diligence-science");
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured." }, { status: 503 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const abstract = String(body.abstract || "").trim().slice(0, 6000);
  const context = String(body.context || "").trim().slice(0, 1000);
  const title = String(body.title || "").trim().slice(0, 300);
  if (abstract.length < 80) return Response.json({ error: "Paste the startup's claimed technology as an abstract (a few sentences)." }, { status: 400 });

  try {
    const query = abstract.slice(0, 400);
    const num = (v: any) => (Number.isFinite(+v) ? +v : 0);
    const [scores, papersRes, patentsRes] = await Promise.all([
      scoreAbstract(abstract),
      searchPapers({ search: query, limit: 10 }).catch(() => ({ total: 0, papers: [] })),
      searchPatents({ search: query, limit: 8 }).catch(() => ({ total: 0, patents: [] })),
    ]);
    const comparables = papersRes.papers.map((p) => ({ id: p.id, title: p.title, year: p.year, comm: num(p.compot), authors: (p.researcherNames || []).map((a) => a.res_name).filter(Boolean).slice(0, 3).join(", ") }));
    const patents = patentsRes.patents.map((p) => ({ id: p.id, title: p.title, year: p.year, assignees: (p.assigneeNames || []).slice(0, 3).join(", ") }));

    const read = await diligenceScienceAI({ abstract, context, scores, comparables, patents });
    if (!read) return Response.json({ error: "Scored it but couldn't write the read. Try again." }, { status: 502 });
    return Response.json({ scores, comparables, patents, read, title });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Failed to run diligence." }, { status: 500 });
  }
}
