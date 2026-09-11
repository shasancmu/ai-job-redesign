import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, caseImproveAI } from "@/lib/ai";
import { caseBySlug } from "@/lib/cases/registry";
import { loadLivingCase, caseAuthorId } from "@/lib/cases/store";
import { caseInsights } from "@/lib/cases/events";
import { isSuperadmin } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Suggest edits to a case grounded in how it actually ran. Author-gated.
export async function POST(request: Request) {
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const slug = String(body.slug || "").trim();
  if (!slug) return Response.json({ error: "Missing case." }, { status: 400 });

  const builtin = caseBySlug(slug);
  const canEdit = builtin ? await isSuperadmin(user) : (await caseAuthorId(slug)) === user.id;
  if (!canEdit) return Response.json({ error: "Not yours." }, { status: 403 });

  const genome = builtin || (await loadLivingCase(slug, user.id));
  if (!genome) return Response.json({ error: "Not found." }, { status: 404 });
  const ins = await caseInsights(slug);
  if (ins.readers === 0) return Response.json({ error: "No engagement yet. Share the case with a class first, then come back for data-driven suggestions." }, { status: 400 });

  setFlow("cases:improve");
  try {
    const out = await caseImproveAI({
      title: genome.title,
      decision: genome.decision,
      readers: ins.readers,
      completionPct: Math.round(ins.completionRate * 100),
      decisions: ins.decisions.map((d) => `${d.label} (${d.n})`).join("; "),
      questions: ins.questions.slice(0, 15).map((q) => q.q).join(" | "),
    });
    const suggestions = (Array.isArray(out?.suggestions) ? out.suggestions : []).slice(0, 5)
      .map((s: any) => ({ title: String(s?.title || ""), why: String(s?.why || ""), action: String(s?.action || "") }))
      .filter((s: any) => s.title);
    return Response.json({ suggestions });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Couldn't generate suggestions." }, { status: 500 });
  }
}
