import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, domainBriefAI } from "@/lib/ai";
import {
  SCIENTIFIQ_ENABLED,
  ScientifiqError,
  searchPapers,
  searchResearchers,
  searchPatents,
  searchOrganizations,
  getFields,
  type SciField,
} from "@/lib/scientifiq";
import { buildDomainBriefData, NC_UNIVERSITIES } from "@/lib/domainBrief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Warm-start caches: the field taxonomy and resolved org ids rarely change.
let fieldsCache: SciField[] | null = null;
const orgIdCache = new Map<string, string | null>();

// Resolve an institution name to its Scientifiq org id. A bare search for
// "Duke" returns many units ("Duke Institute…", "Duke Medical Center", "Duke
// University"), so prefer an EXACT name match, then a startsWith, then the
// shortest name (usually the parent institution), before falling back.
async function resolveOrg(name: string): Promise<string | null> {
  const key = name.toLowerCase();
  if (orgIdCache.has(key)) return orgIdCache.get(key) || null;
  try {
    const orgs = await searchOrganizations(name, 15);
    const q = name.trim().toLowerCase();
    const exact = orgs.find((o) => o.name.trim().toLowerCase() === q);
    const starts = orgs.find((o) => o.name.trim().toLowerCase().startsWith(q));
    const shortest = [...orgs].sort((a, b) => a.name.length - b.name.length)[0];
    const hit = exact || starts || shortest || null;
    const id = hit ? hit.id : null;
    orgIdCache.set(key, id);
    return id;
  } catch {
    orgIdCache.set(key, null);
    return null;
  }
}

export async function POST(request: Request) {
  if (!SCIENTIFIQ_ENABLED) return Response.json({ error: "Scientifiq is not configured (SCIENTIFIQ_API_KEY)." }, { status: 503 });
  if (!AI_ENABLED) return Response.json({ error: "AI is not configured." }, { status: 503 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const domain = String(body.domain || "").trim().slice(0, 200);
  const scopeKind: string = ["org", "region", "country", "global"].includes(body.scopeKind) ? body.scopeKind : "org";
  const orgQuery = String(body.orgQuery || "Duke University").trim().slice(0, 120);
  const bodyOrgIds: string[] = Array.isArray(body.orgIds) ? body.orgIds.map((x: any) => String(x)).slice(0, 12) : [];
  const countryId = String(body.countryId || "").trim().slice(0, 8);
  const clientLabel = String(body.scopeLabel || "").trim().slice(0, 160);
  const purpose = String(body.purpose || "assess");
  if (!domain) return Response.json({ error: "Enter a technology domain." }, { status: 400 });

  try {
    // 1) Resolve scope → org ids / country + a human label. The client picker
    // sends explicit orgIds (the chosen institution + any affiliated orgs), so
    // it is transparent exactly which organizations are included.
    let orgIds: string[] = [];
    let countries: string[] = [];
    let scopeLabel = "Global (all institutions)";
    if (scopeKind === "org") {
      if (bodyOrgIds.length) {
        orgIds = bodyOrgIds;
        scopeLabel = clientLabel || orgQuery;
      } else {
        const id = await resolveOrg(orgQuery);
        if (!id) return Response.json({ error: `Couldn't find "${orgQuery}" in Scientifiq. Try the full institution name.` }, { status: 404 });
        orgIds = [id];
        scopeLabel = orgQuery;
      }
    } else if (scopeKind === "country") {
      if (!countryId) return Response.json({ error: "Pick a country." }, { status: 400 });
      countries = [countryId];
      scopeLabel = clientLabel || `Country: ${countryId.toUpperCase()}`;
    } else if (scopeKind === "region") {
      const ids = (await Promise.all(NC_UNIVERSITIES.map(resolveOrg))).filter(Boolean) as string[];
      if (ids.length === 0) return Response.json({ error: "Couldn't resolve the North Carolina institutions." }, { status: 404 });
      orgIds = ids;
      scopeLabel = "North Carolina universities";
    }

    // 2) Fetch in parallel, all in RELEVANCE order (semantic search) so the
    // experts and papers actually match the domain. The API's `total` is a hard
    // 10000 ceiling, so we report the analyzed sample instead. Patents are
    // best-effort and never block the brief.
    const orgParam = orgIds.length ? orgIds : undefined;
    const countryParam = countries.length ? countries : undefined;
    const [papersRes, researchersRes, fields, patentsRes] = await Promise.all([
      searchPapers({ search: domain, organizations: orgParam, countries: countryParam, limit: 80 }),
      searchResearchers({ search: domain, organizations: orgParam, countries: countryParam, limit: 50 }),
      fieldsCache ? Promise.resolve(fieldsCache) : getFields().then((f) => (fieldsCache = f)),
      searchPatents({ search: domain, limit: 8 }).catch(() => ({ total: 0, patents: [] })),
    ]);

    if ((papersRes.papers?.length || 0) === 0 && (researchersRes.researchers?.length || 0) === 0) {
      return Response.json({ error: `No research found for "${domain}" in ${scopeLabel}. Try a broader term.` }, { status: 404 });
    }

    // 3) Aggregate → structured data. Counts are the analyzed sample (most
    // relevant), not a claimed universe total.
    const data = buildDomainBriefData({
      domain,
      scopeLabel,
      paperTotal: papersRes.papers.length,
      researcherTotal: researchersRes.researchers.length,
      papers: papersRes.papers,
      researchers: researchersRes.researchers,
      patents: patentsRes.patents,
      subFields: fields,
    });

    // 4) Narrative on top of the numbers.
    const brief = await domainBriefAI({ domain, scopeLabel, purpose, data });
    if (!brief) return Response.json({ error: "Built the data but couldn't write the brief. Try again." }, { status: 502 });

    return Response.json({ data, brief });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Failed to build the brief." }, { status: 500 });
  }
}
