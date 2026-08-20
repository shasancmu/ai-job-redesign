import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, collaboratorsAI } from "@/lib/ai";
import { SCIENTIFIQ_ENABLED, ScientifiqError, searchResearchers, searchOrganizations } from "@/lib/scientifiq";
import { summarizeExpert, NC_UNIVERSITIES } from "@/lib/domainBrief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const orgIdCache = new Map<string, string | null>();
async function resolveOrg(name: string): Promise<string | null> {
  const key = name.toLowerCase();
  if (orgIdCache.has(key)) return orgIdCache.get(key) || null;
  try {
    const orgs = await searchOrganizations(name, 15);
    const q = name.trim().toLowerCase();
    const hit = orgs.find((o) => o.name.trim().toLowerCase() === q) || orgs.find((o) => o.name.trim().toLowerCase().startsWith(q)) || [...orgs].sort((a, b) => a.name.length - b.name.length)[0] || null;
    const id = hit ? hit.id : null;
    orgIdCache.set(key, id);
    return id;
  } catch {
    orgIdCache.set(key, null);
    return null;
  }
}

// Find Collaborators — semantic search for related researchers at the person's
// institution, then the LLM ranks by COMPLEMENTARITY. (authorSearch is too
// loose to resolve a person by name, so we key off their described work.)
export async function POST(request: Request) {
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured." }, { status: 503 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  const focus = String(body.focus || "").trim().slice(0, 5000);
  const orgQuery = String(body.orgQuery || "Duke University").trim().slice(0, 120);
  const scopeKind = body.scopeKind === "region" ? "region" : "org";
  const connectionKinds: string[] = Array.isArray(body.connectionKinds) ? body.connectionKinds.slice(0, 8).map((x: any) => String(x)) : [];
  if (focus.length < 40) return Response.json({ error: "Describe your work in a sentence or two first." }, { status: 400 });

  try {
    let orgIds: string[] = [];
    let scopeLabel = orgQuery;
    if (scopeKind === "region") {
      orgIds = (await Promise.all(NC_UNIVERSITIES.map(resolveOrg))).filter(Boolean) as string[];
      scopeLabel = "North Carolina universities";
    } else {
      const id = await resolveOrg(orgQuery);
      if (!id) return Response.json({ error: `Couldn't find "${orgQuery}" in Scientifiq. Try the full institution name.` }, { status: 404 });
      orgIds = [id];
    }

    const { researchers } = await searchResearchers({ search: focus, organizations: orgIds, limit: 30 });
    if (!researchers.length) return Response.json({ error: `No related researchers found at ${scopeLabel}. Try describing your work differently.` }, { status: 404 });

    const candidates = researchers.map((r, i) => {
      const e = summarizeExpert(r);
      return { index: i, id: e.id, name: e.name, org: e.org, subfields: e.subfields, bio: e.bio, scipot: e.scipot, compot: e.compot, titles: (e.representative || []).join("; ") };
    });

    const report = await collaboratorsAI({ focus, connectionKinds, scopeLabel, candidates });
    if (!report) return Response.json({ error: "Couldn't rank collaborators. Try again." }, { status: 502 });

    // Attach the full candidate record to each match (by index) for the report.
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
    return Response.json({ error: e?.message || "Failed to find collaborators." }, { status: 500 });
  }
}
