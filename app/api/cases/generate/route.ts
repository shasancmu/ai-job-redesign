import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, caseGenomeAI } from "@/lib/ai";
import type { CaseGenome, CaseBeat, CaseDeeper } from "@/lib/cases/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "case";

// Coerce whatever the model returned into a valid genome, and strip any media it
// invented (broken embeds are worse than none — the instructor adds real ones).
function sanitize(raw: any, idea: string): CaseGenome {
  const str = (v: any, d = "") => (typeof v === "string" ? v : d);
  const beats = (arr: any): CaseBeat[] =>
    (Array.isArray(arr) ? arr : []).slice(0, 4).map((b: any, i: number) => ({
      n: str(b?.n, String(i + 1)),
      kicker: str(b?.kicker, ""),
      title: str(b?.title, ""),
      body: str(b?.body, ""),
      deeper: (Array.isArray(b?.deeper) ? b.deeper : []).slice(0, 3).map((d: any): CaseDeeper => ({ label: str(d?.label), body: str(d?.body) })).filter((d: CaseDeeper) => d.label && d.body),
      teach: str(b?.teach) || undefined,
      // deliberately no video/exhibit from the generator
    }));
  return {
    slug: slugify(str(raw?.title, idea)),
    eyebrow: str(raw?.eyebrow, "Strategy"),
    title: str(raw?.title, idea),
    dek: str(raw?.dek),
    protagonist: str(raw?.protagonist, "The founder"),
    decision: str(raw?.decision, "make the call"),
    meta: str(raw?.meta, "~10 min"),
    situationBeats: beats(raw?.situationBeats),
    commitPrompt: str(raw?.commitPrompt, "What do you do?"),
    commitOptions: (Array.isArray(raw?.commitOptions) ? raw.commitOptions : []).slice(0, 4).map((o: any, i: number) => ({ k: str(o?.k, String(i)), label: str(o?.label), blurb: str(o?.blurb) })).filter((o: any) => o.label),
    revealBeats: beats(raw?.revealBeats),
    interrogate: (Array.isArray(raw?.interrogate) ? raw.interrogate : []).slice(0, 3).map((x: any) => ({ q: str(x?.q), a: str(x?.a) })).filter((x: any) => x.q && x.a),
    sources: (Array.isArray(raw?.sources) ? raw.sources : []).slice(0, 8).map((s: any) => ({ label: str(s?.label), href: str(s?.href) })).filter((s: any) => /^https?:\/\//.test(s.href)),
    teachingIntro: str(raw?.teachingIntro) || undefined,
    generated: true,
  };
}

export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const idea = String(body.idea || "").trim().slice(0, 300);
  const decision = String(body.decision || "").trim().slice(0, 300);
  const protagonist = String(body.protagonist || "").trim().slice(0, 120);
  if (!idea || !decision) return Response.json({ error: "Give a business idea/company and a decision to teach." }, { status: 400 });

  setFlow("case-generate");
  try {
    const raw = await caseGenomeAI({ idea, decision, protagonist });
    const genome = sanitize(raw, idea);
    if (!genome.situationBeats.length || !genome.commitOptions.length || !genome.revealBeats.length) {
      return Response.json({ error: "The draft came back incomplete. Try a more specific idea and decision." }, { status: 502 });
    }
    return Response.json({ genome });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Failed to generate." }, { status: 500 });
  }
}
