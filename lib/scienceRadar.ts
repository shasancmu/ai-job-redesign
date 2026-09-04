// Science Radar — "where's the science you could be using?". Two modes:
//   * company mode: look up the company's patents, derive its tech footprint,
//     find the scored frontier in those fields, and (via Reliance on Science)
//     which science it already cites vs. the frontier it doesn't, and which
//     firms are building on the same science.
//   * domain mode (patent-poor firms / SMEs): the same scored frontier for a
//     described domain, without the citation spine.
// Cost-safe by construction: footprint + frontier come from the Scientifiq API;
// the citation edges use the slim RoS table (cheap, cached). We never touch the
// 250M-row openalex.works or score-per-DOI path.

import { searchPatents } from "./scientifiq";
import { gatherDomainData } from "./domainScan";
import { firmsBuildingOnScience } from "./citingFirms";
import { companyRadarTermsAI } from "./ai";
import { normalizeDoi, citedDoisByPatents, bqQuery, BIGQUERY_ENABLED } from "./bigquery";

export type Footprint = {
  found: boolean;
  company: string;
  patentCount: number;
  keywords: string[];
  areas: string[];
  terms: string[];
  sampleTitles: string[];
  titles: string[];
  patentIds: string[]; // RoS form, e.g. US-4985915
};

const STOP = new Set("a an and the of for to in on with using method system device apparatus process based having between within said same into from by or via at least one more high low new improved".split(" "));

function titleKeywords(titles: string[]): string[] {
  const c = new Map<string, number>();
  for (const t of titles) for (const w of (t || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)) if (w.length > 3 && !STOP.has(w)) c.set(w, (c.get(w) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k);
}

// The company's REAL patents from PatentsView (by assignee), not a semantic guess.
async function realPatents(company: string): Promise<{ id: string; title: string }[]> {
  const like = "%" + company.toLowerCase().replace(/[%_]/g, "") + "%";
  const rows = await bqQuery(
    `SELECT p.id AS id, p.title AS title
     FROM \`com-sci-2.patentsview.patent_assignee\` pa
     JOIN \`com-sci-2.patentsview.assignee\` a ON a.id = pa.assignee_id
     JOIN \`com-sci-2.patentsview.patent\` p ON p.id = pa.patent_id
     WHERE LOWER(a.organization) LIKE @co
     LIMIT 200`,
    [{ name: "co", type: "STRING", value: like }], { maxBytesBilled: 3 * 1024 ** 3 }
  );
  return rows.map((r) => ({ id: r.id, title: r.title }));
}

// Fallback footprint from the semantic patent API (used when BigQuery is off or
// PatentsView has no assignee match). Semantically biased, but better than none.
async function apiFootprint(company: string): Promise<Footprint> {
  const res = await searchPatents({ search: company, limit: 60 } as any).catch(() => ({ total: 0, patents: [] as any[] }));
  const tok = company.toLowerCase().replace(/\b(inc|ltd|co|corp|llc|gmbh|plc|company)\b/g, "").trim().split(/\s+/)[0] || company.toLowerCase();
  const mine = (res.patents as any[]).filter((p) => (p.assigneeNames || []).some((a: string) => a.toLowerCase().includes(tok)));
  const titles = mine.map((p) => p.title);
  return { found: mine.length >= 5, company, patentCount: mine.length, keywords: titleKeywords(titles), areas: [], terms: [], sampleTitles: titles.slice(0, 8), titles, patentIds: mine.map((p) => p.id) };
}

export async function companyFootprint(company: string): Promise<Footprint> {
  if (BIGQUERY_ENABLED) {
    try {
      const pats = await realPatents(company);
      if (pats.length >= 10) {
        const titles = pats.map((p) => p.title).filter(Boolean);
        return { found: true, company, patentCount: pats.length, keywords: titleKeywords(titles), areas: [], terms: [], sampleTitles: titles.slice(0, 8), titles, patentIds: pats.map((p) => "US-" + p.id) };
      }
    } catch { /* fall through to API */ }
  }
  return apiFootprint(company);
}

export type RadarResult = {
  mode: "company" | "domain";
  footprint: Footprint | null;
  domainQuery: string;
  data: any; // DomainBriefData
  firms: any; // CitingFirmsResult | null
  whitespace: any[]; // standout papers the company doesn't already cite
  citedCount: number;
};

export async function radarReport(input: { company?: string; domain?: string }): Promise<RadarResult | { error: string; status?: number }> {
  const company = (input.company || "").trim();
  let footprint: Footprint | null = null;
  let mode: "company" | "domain" = company ? "company" : "domain";
  let domainQuery = (input.domain || "").trim();

  if (company) {
    footprint = await companyFootprint(company);
    if (footprint.found) {
      // Derive the domain from the REAL patent titles (short topical terms match
      // the frontier search far better than a keyword bag).
      try {
        const t = await companyRadarTermsAI(company, footprint.titles);
        if (Array.isArray(t?.terms) && t.terms.length) { footprint.terms = t.terms.map((x: any) => String(x)).slice(0, 5); footprint.areas = (t.areas || []).map((x: any) => String(x)); }
      } catch { /* keyword fallback below */ }
      // A single focused topical phrase (the dominant area) scans fast; a long
      // multi-term query makes the semantic search time out.
      domainQuery = (footprint.terms[0] || footprint.keywords[0] || company);
    } else { mode = "domain"; domainQuery = domainQuery || company; }
  }
  if (!domainQuery) return { error: "Enter a company name or a technology domain.", status: 400 };

  const g = await gatherDomainData({ domain: domainQuery.slice(0, 200) });
  if ("error" in g) return { error: (g as any).error, status: (g as any).status };
  const data = g.data;
  const standout = (data.standoutPapers || []) as any[];

  // What science the company already cites (RoS reverse) -> whitespace = frontier
  // papers it is NOT already citing. Cheap RoS query, cached upstream.
  let citedSet = new Set<string>();
  if (mode === "company" && footprint?.found && BIGQUERY_ENABLED && footprint.patentIds.length) {
    try { const rows = await citedDoisByPatents(footprint.patentIds); citedSet = new Set(rows.map((r) => r.doi)); } catch { /* optional */ }
  }
  const whitespace = standout.filter((p) => { const d = normalizeDoi(p.url); return d && !citedSet.has(d); }).slice(0, 8);

  // Who else is building on this science (competitors) -> firms citing it.
  let firms: any = null;
  if (BIGQUERY_ENABLED) {
    const inputs = standout.map((p) => ({ doi: p.url, authors: [] as string[] })).filter((x) => normalizeDoi(x.doi));
    if (inputs.length) firms = await firmsBuildingOnScience(inputs).catch(() => null);
  }

  return { mode, footprint, domainQuery, data, firms, whitespace, citedCount: citedSet.size };
}
