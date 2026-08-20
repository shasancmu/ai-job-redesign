// ============================================================================
// "Firms building on this science" + the researcher → firm pipeline.
//
// Reliance on Science (BigQuery) maps each paper (DOI) to its citing patents;
// Scientifiq resolves each patent to an assignee (a company or university).
// Attributing each paper's citing firms back to the paper's authors gives the
// PIPELINE: which researchers' science flows into which organizations — the
// data behind the Sankey.
//
// Join detail (verified live): RoS `patent` has no kind code ("US-10507916");
// Scientifiq keys patents with one ("US-10507916-B2"), so we try the common kind
// codes and batch-resolve via the patentIDs filter.
// ============================================================================

import { citingRowsByDoi, normalizeDoi } from "./bigquery";
import { searchPatents } from "./scientifiq";

export type FirmSummary = { name: string; patents: number; latestYear?: number };
export type PipelineLink = { source: string; target: string; value: number };
export type SciencePipeline = { researchers: string[]; firms: string[]; links: PipelineLink[] };

export type CitingFirmsResult = {
  firms: FirmSummary[];
  citingPatentCount: number;
  resolvedPatentCount: number;
  pipeline: SciencePipeline;
};

export type PaperInput = { doi?: string; authors: string[] };

const KIND_CODES = ["-B2", "-B1", "-A1", "-A2", "-A"];
const SEP = ""; // link-key separator that can't appear in a name
const stripKind = (id: string) => id.replace(/-[A-Z][0-9]?$/, "").toUpperCase();

async function mapLimited<T, R>(items: T[], concurrency: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) out.push(...(await Promise.all(items.slice(i, i + concurrency).map(fn))));
  return out;
}

export async function firmsBuildingOnScience(papers: PaperInput[], maxPatents = 300): Promise<CitingFirmsResult> {
  // DOI (normalized) → the paper's authors.
  const doiAuthors = new Map<string, string[]>();
  for (const p of papers) {
    const d = normalizeDoi(p.doi);
    if (d) doiAuthors.set(d, (p.authors || []).slice(0, 4));
  }
  const dois = [...doiAuthors.keys()];
  if (dois.length === 0) return empty();

  const rows = await citingRowsByDoi(dois); // {doi, patent, filingYear}
  const doiPatents = new Map<string, Set<string>>(); // doi → base patents
  const yearOf = new Map<string, number | undefined>();
  const distinct = new Set<string>();
  for (const r of rows.slice(0, maxPatents * 3)) {
    const base = r.patent.toUpperCase();
    distinct.add(base);
    yearOf.set(base, r.filingYear);
    if (!doiPatents.has(r.doi)) doiPatents.set(r.doi, new Set());
    doiPatents.get(r.doi)!.add(base);
  }
  const citingPatentCount = distinct.size;

  // Resolve base patents → firms via Scientifiq (kind-code candidates, batched).
  const patents = [...distinct].slice(0, maxPatents);
  const candidates = patents.flatMap((base) => KIND_CODES.map((k) => base + k));
  const batches: string[][] = [];
  for (let i = 0; i < candidates.length; i += 50) batches.push(candidates.slice(i, i + 50));
  const resolvedPatents = (await mapLimited(batches, 5, (b) => searchPatents({ patentIDs: b, limit: 50 }).then((r) => r.patents).catch(() => []))).flat();

  const patentFirms = new Map<string, string[]>(); // base patent → firms
  for (const p of resolvedPatents) {
    const base = stripKind(String(p.id));
    const firms = (p.assigneeNames || []).filter(Boolean);
    if (firms.length) patentFirms.set(base, firms);
  }
  const resolvedPatentCount = patentFirms.size;

  // Firm ranking: distinct citing patents per assignee.
  const firmCount = new Map<string, { patents: Set<string>; latestYear?: number }>();
  for (const [base, firms] of patentFirms) {
    for (const f of firms) {
      const cur = firmCount.get(f) || { patents: new Set<string>(), latestYear: undefined };
      cur.patents.add(base);
      const yr = yearOf.get(base);
      if (yr && (!cur.latestYear || yr > cur.latestYear)) cur.latestYear = yr;
      firmCount.set(f, cur);
    }
  }
  const firms = [...firmCount.entries()]
    .map(([name, v]) => ({ name, patents: v.patents.size, latestYear: v.latestYear }))
    .sort((a, b) => b.patents - a.patents || (b.latestYear || 0) - (a.latestYear || 0));

  // Pipeline: each paper's citing firms attributed to each of its authors.
  const linkW = new Map<string, number>(); // `${author}${SEP}${firm}` → distinct papers
  for (const [doi, pats] of doiPatents) {
    const authors = doiAuthors.get(doi) || [];
    if (authors.length === 0) continue;
    const firmsForDoi = new Set<string>();
    for (const pat of pats) for (const f of patentFirms.get(pat) || []) firmsForDoi.add(f);
    for (const a of authors) for (const f of firmsForDoi) {
      const key = a + SEP + f;
      linkW.set(key, (linkW.get(key) || 0) + 1);
    }
  }

  return { firms, citingPatentCount, resolvedPatentCount, pipeline: buildPipeline(linkW) };
}

// Keep only the strongest links among the top researchers and top firms so the
// Sankey stays legible.
function buildPipeline(linkW: Map<string, number>, maxR = 10, maxF = 10): SciencePipeline {
  const rOut = new Map<string, number>();
  const fIn = new Map<string, number>();
  for (const [k, v] of linkW) {
    const [r, f] = k.split(SEP);
    rOut.set(r, (rOut.get(r) || 0) + v);
    fIn.set(f, (fIn.get(f) || 0) + v);
  }
  const topR = new Set([...rOut.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxR).map(([r]) => r));
  const topF = new Set([...fIn.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxF).map(([f]) => f));
  const links: PipelineLink[] = [];
  for (const [k, v] of linkW) {
    const [source, target] = k.split(SEP);
    if (topR.has(source) && topF.has(target)) links.push({ source, target, value: v });
  }
  links.sort((a, b) => b.value - a.value);
  const researchers = [...topR].filter((r) => links.some((l) => l.source === r));
  const firms = [...topF].filter((f) => links.some((l) => l.target === f));
  return { researchers, firms, links };
}

function empty(): CitingFirmsResult {
  return { firms: [], citingPatentCount: 0, resolvedPatentCount: 0, pipeline: { researchers: [], firms: [], links: [] } };
}
