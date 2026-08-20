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
  keywords: string;
  representative: string[]; // a few representative titles
  relevanceRank?: number; // original position in the semantic-relevance results
};

// A collaboration network among the domain's experts, plus the "should talk"
// recommendations: pairs who work on very similar topics but have never
// co-authored (a structural hole worth bridging, Burt 1992).
export type CollabNode = { id: string; name: string; org: string; compot: number; scipot: number; degree: number };
export type CollabEdge = { a: number; b: number; weight: number }; // indices into nodes; weight = shared papers
export type ShouldTalk = { aName: string; bName: string; aId: string; bId: string; sharedTopics: string[]; sim: number };
export type CollabGraph = { nodes: CollabNode[]; edges: CollabEdge[]; shouldTalk: ShouldTalk[] };

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
  collab: CollabGraph;
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
    keywords: r.keywordsString || "",
    representative: titles,
  };
}

// Topic tokens for similarity: subfields + keywords, normalized.
function topicTokens(e: { subfields?: string; keywords?: string }): Set<string> {
  const s = new Set<string>();
  for (const part of [e.subfields || "", e.keywords || ""]) {
    for (const t of part.toLowerCase().split(/[,;]/).map((x) => x.trim()).filter((x) => x.length > 2)) s.add(t);
  }
  return s;
}

function jaccard(a: Set<string>, b: Set<string>): { sim: number; shared: string[] } {
  if (a.size === 0 || b.size === 0) return { sim: 0, shared: [] };
  const shared: string[] = [];
  for (const t of a) if (b.has(t)) shared.push(t);
  const union = new Set([...a, ...b]).size;
  return { sim: union ? shared.length / union : 0, shared };
}

// Co-authorship edges from shared papers + the "should talk" recommendations.
export function buildCollabGraph(experts: ExpertSummary[], papers: SciPaper[]): CollabGraph {
  const nodes: CollabNode[] = experts.map((e) => ({ id: e.id, name: e.name, org: e.org, compot: e.compot, scipot: e.scipot, degree: 0 }));
  const idx = new Map(nodes.map((n, i) => [n.id, i]));

  // Weighted co-authorship: two experts share an edge for each paper they co-wrote.
  const edgeW = new Map<string, number>();
  for (const p of papers) {
    const here = (p.researcherIds || []).filter((id) => idx.has(String(id))).map((id) => idx.get(String(id))!);
    for (let i = 0; i < here.length; i++) {
      for (let j = i + 1; j < here.length; j++) {
        const a = here[i], b = here[j];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        edgeW.set(key, (edgeW.get(key) || 0) + 1);
      }
    }
  }
  const connected = new Set(edgeW.keys());
  const edges: CollabEdge[] = [...edgeW.entries()].map(([k, w]) => {
    const [a, b] = k.split("-").map(Number);
    nodes[a].degree += w; nodes[b].degree += w;
    return { a, b, weight: w };
  });

  // Neighbor sets (who each expert has co-authored with) so we can tell a true
  // structural hole (no shared collaborator either) from a merely-direct gap.
  const neigh: Set<number>[] = nodes.map(() => new Set<number>());
  for (const e of edges) { neigh[e.a].add(e.b); neigh[e.b].add(e.a); }
  const sharesNeighbor = (i: number, j: number) => { for (const x of neigh[i]) if (neigh[j].has(x)) return true; return false; };

  // Should-talk: topically similar pairs with NO co-authorship tie, different
  // people. Prefer genuine structural holes (no shared collaborator either);
  // fall back to direct-gap pairs if too few holes surface.
  const toks = experts.map(topicTokens);
  const holes: ShouldTalk[] = [];
  const near: ShouldTalk[] = [];
  for (let i = 0; i < experts.length; i++) {
    for (let j = i + 1; j < experts.length; j++) {
      if (connected.has(`${i}-${j}`)) continue; // already collaborate
      if (experts[i].name.trim().toLowerCase() === experts[j].name.trim().toLowerCase()) continue; // dup record
      const { sim, shared } = jaccard(toks[i], toks[j]);
      if (shared.length < 2 || sim < 0.12) continue;
      const rec: ShouldTalk = { aName: experts[i].name, bName: experts[j].name, aId: experts[i].id, bId: experts[j].id, sharedTopics: shared.slice(0, 5), sim };
      (sharesNeighbor(i, j) ? near : holes).push(rec);
    }
  }
  holes.sort((a, b) => b.sim - a.sim);
  near.sort((a, b) => b.sim - a.sim);
  const shouldTalk = [...holes, ...near].slice(0, 8);
  return { nodes, edges, shouldTalk };
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
  const seenNames = new Set<string>();
  const topExperts = rr
    .map(({ e, rank }) => {
      const relevanceNorm = (n - rank) / n; // 1 at top of relevance, →0 at the tail
      const commercialNorm = (e.compot || 0) / 100;
      return { ...e, relevanceRank: rank, _fit: relevanceNorm * commercialNorm };
    })
    .sort((a, b) => b._fit - a._fit)
    // Dedupe duplicate author records (same name, different ids) so a person
    // never appears twice or gets recommended to talk to themselves.
    .filter((e) => { const k = e.name.trim().toLowerCase(); if (!k || seenNames.has(k)) return false; seenNames.add(k); return true; })
    .slice(0, 15)
    .map(({ _fit, ...e }) => e);

  const patents = (input.patents || []).slice(0, 6).map((p) => ({
    title: p.title || "Untitled",
    year: p.year,
    assignees: (p.assigneeNames || []).slice(0, 3).join(", "),
    url: p.url,
  }));

  const collab = buildCollabGraph(topExperts, input.papers);

  return {
    domain: input.domain,
    scopeLabel: input.scopeLabel,
    paperCount: input.paperTotal,
    researcherCount: input.researcherTotal,
    collab,
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
