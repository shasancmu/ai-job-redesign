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
import { normalizeDoi, citedDoisByPatents, BIGQUERY_ENABLED } from "./bigquery";

export type Footprint = {
  found: boolean;
  company: string;
  patentCount: number;
  keywords: string[];
  subfields: { name: string; count: number }[];
  sampleTitles: string[];
  patentIds: string[];
};

export async function companyFootprint(company: string): Promise<Footprint> {
  const res = await searchPatents({ search: company, limit: 80 } as any).catch(() => ({ total: 0, patents: [] as any[] }));
  const tok = company.toLowerCase().replace(/\b(inc|ltd|co|corp|llc|gmbh|plc|company|technologies|electronics)\b/g, "").trim().split(/\s+/)[0] || company.toLowerCase();
  const mine = (res.patents as any[]).filter((p) => (p.assigneeNames || []).some((a: string) => a.toLowerCase().includes(tok)));
  const kw = new Map<string, number>();
  const sub = new Map<string, number>();
  for (const p of mine) {
    (p.keywords || []).forEach((k: any) => { const s = String(k).trim(); if (s) kw.set(s, (kw.get(s) || 0) + 1); });
    (p.subfields || []).forEach((s: any) => { const v = String(s).trim(); if (v) sub.set(v, (sub.get(v) || 0) + 1); });
  }
  return {
    found: mine.length >= 5,
    company,
    patentCount: mine.length,
    keywords: [...kw.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k),
    subfields: [...sub.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
    sampleTitles: mine.slice(0, 5).map((p) => p.title),
    patentIds: mine.map((p) => p.id),
  };
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
    if (footprint.found) domainQuery = footprint.keywords.slice(0, 6).join(", ") || footprint.subfields[0]?.name || company;
    else { mode = "domain"; domainQuery = domainQuery || company; }
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
