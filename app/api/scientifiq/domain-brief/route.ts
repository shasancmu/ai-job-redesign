import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, domainBriefAI } from "@/lib/ai";
import {
  SCIENTIFIQ_ENABLED,
  ScientifiqError,
  searchPapers,
  searchResearchers,
  searchPatents,
  getFields,
  type SciField,
} from "@/lib/scientifiq";
import { buildDomainBriefData } from "@/lib/domainBrief";
import { BIGQUERY_ENABLED, normalizeDoi } from "@/lib/bigquery";
import { firmsBuildingOnScience } from "@/lib/citingFirms";

export const runtime = "nodejs";
import { setFlow } from "@/lib/aiflow";
export const dynamic = "force-dynamic";

// Warm-start cache: the field taxonomy rarely changes.
let fieldsCache: SciField[] | null = null;

export async function POST(request: Request) {
  setFlow("domain-brief");
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
  const scopeKind: string = ["org", "country", "global"].includes(body.scopeKind) ? body.scopeKind : "org";
  const bodyOrgIds: string[] = Array.isArray(body.orgIds) ? body.orgIds.map((x: any) => String(x)).slice(0, 12) : [];
  const countryId = String(body.countryId || "").trim().slice(0, 8);
  const clientLabel = String(body.scopeLabel || "").trim().slice(0, 160);
  const purpose = String(body.purpose || "assess");
  if (!domain) return Response.json({ error: "Enter a technology domain." }, { status: 400 });
  if (scopeKind === "org" && bodyOrgIds.length === 0) return Response.json({ error: "Pick an institution." }, { status: 400 });
  if (scopeKind === "country" && !countryId) return Response.json({ error: "Pick a country." }, { status: 400 });

  try {
    // 1) Scope arrives already resolved by the client scope picker (real
    // Scientifiq org ids + a human label, a two-letter country, or neither for
    // global), so it is transparent exactly which organizations are included.
    let orgIds: string[] = [];
    let countries: string[] = [];
    let scopeLabel = "Global (all institutions)";
    if (scopeKind === "org") {
      orgIds = bodyOrgIds;
      scopeLabel = clientLabel || "Selected institution(s)";
    } else if (scopeKind === "country") {
      countries = [countryId];
      scopeLabel = clientLabel || `Country: ${countryId.toUpperCase()}`;
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

    // 4) Narrative + the firms-building-on-this-science lookup, in parallel so
    // the (slower) BigQuery + patent-assignee resolution hides behind the AI.
    const paperInputs = papersRes.papers
      .filter((p) => normalizeDoi(p.url))
      .map((p) => ({ doi: p.url, authors: (p.researcherNames || []).map((a) => a.res_name).filter(Boolean).slice(0, 4) }));
    const [brief, firms] = await Promise.all([
      domainBriefAI({ domain, scopeLabel, purpose, data }),
      BIGQUERY_ENABLED && paperInputs.length ? firmsBuildingOnScience(paperInputs).catch(() => null) : Promise.resolve(null),
    ]);
    if (!brief) return Response.json({ error: "Built the data but couldn't write the brief. Try again." }, { status: 502 });
    if (firms) (data as any).firms = firms;

    return Response.json({ data, brief });
  } catch (e: any) {
    if (e instanceof ScientifiqError) return Response.json({ error: e.message }, { status: e.status < 600 ? e.status : 502 });
    return Response.json({ error: e?.message || "Failed to build the brief." }, { status: 500 });
  }
}
