import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError } from "@/lib/scientifiq";
import { isSuperadmin } from "@/lib/orgs";
import { runDefenseImpact } from "@/lib/defenseImpact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Defense Impact — estimate a paper's defense / national-security relevance.
// The LLM scores it (chain-of-thought), grounded in real patent-citation
// evidence from Reliance-on-Science when a DOI is supplied. A research-mapping
// score in the same family as Score My Invention.
export async function POST(request: Request) {
  setFlow("defense-impact");
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured." }, { status: 503 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isSuperadmin(user))) return Response.json({ error: "Superadmin only." }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const abstract = String(body.abstract || "").trim().slice(0, 6000);
  const title = String(body.title || "").trim().slice(0, 300);
  const doi = String(body.doi || "").trim().slice(0, 200);
  if (abstract.length < 80) return Response.json({ error: "Paste the research as an abstract (a few sentences)." }, { status: 400 });

  try {
    const { scores, evidence, read, title: outTitle, engine } = await runDefenseImpact({ abstract, title, doi });
    if (!read) return Response.json({ error: "Scored it but couldn't write the read. Try again." }, { status: 502 });
    return Response.json({ scores, evidence, read, title: outTitle, engine });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Failed to estimate defense impact." }, { status: 500 });
  }
}
