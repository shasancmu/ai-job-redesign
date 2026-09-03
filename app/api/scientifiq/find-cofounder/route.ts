import { createClient } from "@/lib/supabase/server";
import { setFlow } from "@/lib/aiflow";
import { AI_ENABLED, cofounderAI } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError, searchResearchers } from "@/lib/scientifiq";
import { summarizeExpert } from "@/lib/domainBrief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Find a Technical Co-Founder / CTO — related researchers within the chosen
// scope, ranked by the LLM for technical-cofounder fit (depth + commercial
// orientation). Scope arrives already resolved by the client scope picker:
// real Scientifiq org ids, a two-letter country, or neither for global.
export async function POST(request: Request) {
  setFlow("find-cofounder");
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured." }, { status: 503 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const focus = String(body.focus || "").trim().slice(0, 5000);
  const scopeKind = ["org", "country", "global"].includes(body.scopeKind) ? body.scopeKind : "org";
  const orgIds: string[] = Array.isArray(body.orgIds) ? body.orgIds.map((x: any) => String(x)).slice(0, 12) : [];
  const countryId = String(body.countryId || "").trim().slice(0, 8);
  const scopeLabel = String(body.scopeLabel || "").trim().slice(0, 160) || (orgIds.length ? "Selected institution(s)" : countryId ? `Country: ${countryId.toUpperCase()}` : "Global (all institutions)");
  const needs: string[] = Array.isArray(body.needs) ? body.needs.slice(0, 8).map((x: any) => String(x)) : [];
  if (focus.length < 40) return Response.json({ error: "Describe your venture's technology in a sentence or two first." }, { status: 400 });
  if (scopeKind === "org" && orgIds.length === 0) return Response.json({ error: "Pick an institution." }, { status: 400 });
  if (scopeKind === "country" && !countryId) return Response.json({ error: "Pick a country." }, { status: 400 });

  try {
    const { researchers } = await searchResearchers({
      search: focus,
      organizations: scopeKind === "org" ? orgIds : undefined,
      countries: scopeKind === "country" ? [countryId] : undefined,
      limit: 30,
    });
    if (!researchers.length) return Response.json({ error: `No related researchers found in ${scopeLabel}. Try describing the technology differently.` }, { status: 404 });

    const candidates = researchers.map((r, i) => {
      const e = summarizeExpert(r);
      return { index: i, id: e.id, name: e.name, org: e.org, subfields: e.subfields, bio: e.bio, scipot: e.scipot, compot: e.compot, titles: (e.representative || []).join("; ") };
    });

    const report = await cofounderAI({ focus, needs, scopeLabel, candidates });
    if (!report) return Response.json({ error: "Couldn't rank candidates. Try again." }, { status: 502 });

    const matches = (report.matches || [])
      .map((m: any) => {
        const c = candidates[m.index];
        if (!c) return null;
        return { ...m, sciId: c.id, org: c.org, subfields: c.subfields, bio: c.bio, scipot: c.scipot, compot: c.compot };
      })
      .filter(Boolean);

    return Response.json({ report: { ...report, matches }, scopeLabel });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Failed to find co-founders." }, { status: 500 });
  }
}
