// Shared data-gather for the Scientifiq landscape modules (Technology Landscape
// Scan, Deep-Tech Deal Sourcing, University Commercialization Scorecard, Where
// Is My Field Going). All four need the same aggregated domain data; only the
// AI framing differs. Extracted from the domain-brief route (minus the optional
// BigQuery firms lookup) so each module route stays thin. Server-only.

import {
  searchPapers, searchResearchers, searchPatents, getFields, type SciField,
} from "@/lib/scientifiq";
import { buildDomainBriefData, type DomainBriefData } from "@/lib/domainBrief";

let fieldsCache: SciField[] | null = null;

export type GatherResult = { data: DomainBriefData; scopeLabel: string } | { error: string; status: number };

// Scope is already RESOLVED by the client scope picker (real Scientifiq ids), so
// there is no fragile name-matching here: orgIds are the chosen institution(s),
// countryId a two-letter country, or neither for global.
export async function gatherDomainData(input: { domain: string; orgIds?: string[]; countryId?: string; scopeLabel?: string }): Promise<GatherResult> {
  const domain = (input.domain || "").trim().slice(0, 200);
  if (!domain) return { error: "Enter a technology or field.", status: 400 };

  const orgIds = (input.orgIds || []).map((s) => String(s)).filter(Boolean).slice(0, 12);
  const countryId = (input.countryId || "").trim();
  const orgParam = orgIds.length ? orgIds : undefined;
  const countryParam = countryId ? [countryId] : undefined;
  const scopeLabel = (input.scopeLabel || "").trim() || (orgIds.length ? "Selected institution(s)" : countryId ? `Country: ${countryId.toUpperCase()}` : "Global (all institutions)");

  const [papersRes, researchersRes, fields, patentsRes] = await Promise.all([
    searchPapers({ search: domain, organizations: orgParam, countries: countryParam, limit: 80 }),
    searchResearchers({ search: domain, organizations: orgParam, countries: countryParam, limit: 50 }),
    fieldsCache ? Promise.resolve(fieldsCache) : getFields().then((f) => (fieldsCache = f)),
    searchPatents({ search: domain, limit: 10 }).catch(() => ({ total: 0, patents: [] })),
  ]);

  if ((papersRes.papers?.length || 0) === 0 && (researchersRes.researchers?.length || 0) === 0) {
    return { error: `No research found for "${domain}" in ${scopeLabel}. Try a broader term.`, status: 404 };
  }

  const data = buildDomainBriefData({
    domain, scopeLabel,
    paperTotal: papersRes.papers.length,
    researcherTotal: researchersRes.researchers.length,
    papers: papersRes.papers,
    researchers: researchersRes.researchers,
    patents: patentsRes.patents,
    subFields: fields,
  });

  return { data, scopeLabel };
}

// Compact text of the aggregated data for an LLM prompt.
export function domainDataForPrompt(data: DomainBriefData): string {
  const experts = (data.topExperts || []).slice(0, 15).map((e) => `${e.name} (${e.org}) sci ${Math.round(e.scipot)}, comm ${Math.round(e.compot)}${e.subfields ? `; ${e.subfields}` : ""}`).join("\n");
  const papers = (data.standoutPapers || []).slice(0, 10).map((p) => `"${p.title}"${p.year ? ` (${p.year})` : ""} comm ${Math.round(p.compot)}${p.authors ? `; ${p.authors}` : ""}`).join("\n");
  const subs = (data.subfieldBreakdown || []).slice(0, 10).map((s) => `${s.name} (${s.count})`).join(", ");
  const pats = (data.patents || []).slice(0, 8).map((p) => `"${p.title}"${p.assignees ? ` — ${p.assignees}` : ""}`).join("\n");
  const years = (data.yearTrend || []).map((y) => `${y.year}:${y.count}`).join(" ");
  return `DOMAIN: ${data.domain}\nSCOPE: ${data.scopeLabel}\nSAMPLE: ${data.researcherCount} researchers, ${data.paperCount} papers analyzed.\nAVERAGE POTENTIAL: commercial ${Math.round(data.avgCommPot)}, scientific ${Math.round(data.avgSciPot)}, social ${Math.round(data.avgSocPot)} (0-100).\nSUBFIELDS (count): ${subs || "n/a"}\nYEAR TREND (count by year): ${years || "n/a"}\nTOP RESEARCHERS:\n${experts || "(none)"}\nSTANDOUT PAPERS:\n${papers || "(none)"}\nNEARBY PATENTS (assignees = companies active in the space):\n${pats || "(none)"}`;
}
