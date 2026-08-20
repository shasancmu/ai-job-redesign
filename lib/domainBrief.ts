// ============================================================================
// Domain Expertise Brief — aggregate Scientifiq data for a technology domain
// within a scope (an institution, a region, or global) into a readable brief.
//
// "What does Duke know about drones, and who are the experts?"
// "Map North Carolina's university expertise in microbiomes."
//
// The route fetches papers + researchers (+ optional patents) for the domain and
// scope; these pure helpers turn the raw lists into the brief's structured data
// (top experts, standout work, sub-field composition, trajectory). The LLM then
// writes the narrative on top of these numbers.
// ============================================================================

import type { SciPaper, SciResearcher, SciPatent, SciField } from "./scientifiq";

export type ScopeKind = "org" | "region" | "global";

// Curated set of North Carolina universities, resolved to Scientifiq org ids at
// request time (by name search) and cached. Names are matched leniently.
export const NC_UNIVERSITIES = [
  "Duke University",
  "University of North Carolina at Chapel Hill",
  "North Carolina State University",
  "Wake Forest University",
  "East Carolina University",
  "University of North Carolina at Charlotte",
  "North Carolina Central University",
  "Appalachian State University",
  "University of North Carolina at Greensboro",
];

export type ExpertSummary = {
  id: string;
  name: string;
  org: string;
  bio: string;
  totalPubs: number;
  acaCites: number;
  compot: number;
  scipot: number;
  socpot: number;
  subfields: string;
  representative: string[]; // a few representative titles
  relevanceRank?: number; // original position in the semantic-relevance results
};

export type PaperSummary = {
  id: string;
  title: string;
  year?: number;
  authors: string;
  compot: number;
  scipot: number;
  socpot: number;
  url?: string;
  journal?: string;
};

export type DomainBriefData = {
  domain: string;
  scopeLabel: string;
  paperCount: number; // total matches reported by the API (not just fetched)
  researcherCount: number;
  avgCommPot: number;
  avgSciPot: number;
  avgSocPot: number;
  topExperts: ExpertSummary[];
  standoutPapers: PaperSummary[];
  subfieldBreakdown: { name: string; count: number }[];
  yearTrend: { year: number; count: number }[];
  patents: { title: string; year?: number; assignees: string; url?: string }[];
};

const num = (v: any): number => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
};

function fieldNameMap(fields: SciField[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of fields || []) m.set(String(f.code), f.name);
  return m;
}

export function summarizeExpert(r: SciResearcher): ExpertSummary {
  const titles = (r.top20CitedTitles || r.top20RecentTitles || "")
    .split(/,\s*(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  return {
    id: String(r.id),
    name: r.name || "Unknown",
    org: (r.orgsNames && r.orgsNames[0]) || "",
    bio: (r.bio || "").slice(0, 600),
    totalPubs: num(r.totalPubs),
    acaCites: num(r.acaCites),
    compot: num(r.compot),
    scipot: num(r.scipot),
    socpot: num(r.socpot),
    subfields: r.subfieldsString || "",
    representative: titles,
  };
}

export function summarizePaper(p: SciPaper): PaperSummary {
  const authors = (p.researcherNames || []).map((a) => a.res_name).filter(Boolean).slice(0, 4).join(", ");
  return {
    id: String(p.id),
    title: p.title || "Untitled",
    year: p.year,
    authors,
    compot: num(p.compot),
    scipot: num(p.scipot),
    socpot: num(p.socpot),
    url: p.url,
    journal: p.journal,
  };
}

// Build the structured brief data from the raw API results. `total` values come
// from the API's reported totals so counts reflect the whole domain, not just
// the page we fetched.
export function buildDomainBriefData(input: {
  domain: string;
  scopeLabel: string;
  paperTotal: number;
  researcherTotal: number;
  papers: SciPaper[];
  researchers: SciResearcher[];
  patents: SciPatent[];
  subFields: SciField[];
}): DomainBriefData {
  const subMap = fieldNameMap(input.subFields);

  // Sub-field composition across the fetched papers. Papers carry sub-field
  // CODES in `subfieldsString` (e.g. "1702, 2203"); map each code to its name.
  // A token that is already a name (non-numeric) is used as-is.
  const subCounts = new Map<string, number>();
  const bump = (name: string) => subCounts.set(name, (subCounts.get(name) || 0) + 1);
  for (const p of input.papers) {
    const tokens = (p.subfieldsString || "").split(",").map((s) => s.trim()).filter(Boolean);
    for (const tok of tokens) {
      if (/^\d+$/.test(tok)) {
        const name = subMap.get(tok);
        if (name) bump(name);
      } else {
        bump(tok);
      }
    }
  }
  const subfieldBreakdown = [...subCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Publication trajectory.
  const yearCounts = new Map<number, number>();
  for (const p of input.papers) {
    if (typeof p.year === "number" && p.year > 1900) yearCounts.set(p.year, (yearCounts.get(p.year) || 0) + 1);
  }
  const yearTrend = [...yearCounts.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

  // Averages over fetched papers.
  const avg = (key: "compot" | "scipot" | "socpot") => {
    const vals = input.papers.map((p) => num(p[key])).filter((v) => v > 0);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  };

  // Standout papers: highest combined potential.
  const standoutPapers = [...input.papers]
    .map(summarizePaper)
    .sort((a, b) => (b.compot + b.scipot + b.socpot) - (a.compot + a.scipot + a.socpot))
    .slice(0, 6);

  // Experts = the UPPER-RIGHT QUADRANT: high commercial potential AND high
  // relevance. The API returns researchers in semantic-relevance order; we score
  // each on relevance (its rank) × commercial potential and keep the leaders, so
  // the brief centers on people who are both on-topic and commercially promising,
  // not merely the most relevant. `relevanceRank` is retained so the report can
  // re-sort back to pure relevance.
  const rr = input.researchers.map((r, i) => ({ e: summarizeExpert(r), rank: i }));
  const n = Math.max(1, rr.length);
  const topExperts = rr
    .map(({ e, rank }) => {
      const relevanceNorm = (n - rank) / n; // 1 at top of relevance, →0 at the tail
      const commercialNorm = (e.compot || 0) / 100;
      return { ...e, relevanceRank: rank, _fit: relevanceNorm * commercialNorm };
    })
    .sort((a, b) => b._fit - a._fit)
    .slice(0, 15)
    .map(({ _fit, ...e }) => e);

  const patents = (input.patents || []).slice(0, 6).map((p) => ({
    title: p.title || "Untitled",
    year: p.year,
    assignees: (p.assigneeNames || []).slice(0, 3).join(", "),
    url: p.url,
  }));

  return {
    domain: input.domain,
    scopeLabel: input.scopeLabel,
    paperCount: input.paperTotal,
    researcherCount: input.researcherTotal,
    avgCommPot: avg("compot"),
    avgSciPot: avg("scipot"),
    avgSocPot: avg("socpot"),
    topExperts,
    standoutPapers,
    subfieldBreakdown,
    yearTrend,
    patents,
  };
}
