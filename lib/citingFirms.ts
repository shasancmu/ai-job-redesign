// ============================================================================
// "Firms building on this science" — the science → industry link.
//
// Reliance on Science (Marx & Fuegi, in BigQuery) gives the patents that cite a
// set of papers (by DOI). Scientifiq gives each patent's assignee (the firm).
// Together: which companies build on a domain's science.
//
// Join details, verified live: RoS `patent` is the number WITHOUT a kind code
// (e.g. "US-10507916"); Scientifiq keys patents WITH one ("US-10507916-B2"). We
// try the common kind codes and batch-resolve via Scientifiq's patentIDs filter.
// ============================================================================

import { citingPatentsByDoi } from "./bigquery";
import { searchPatents } from "./scientifiq";

export type FirmSummary = {
  name: string;
  patents: number; // distinct citing patents this assignee holds
  latestYear?: number; // most recent filing year among them
};

export type CitingFirmsResult = {
  firms: FirmSummary[];
  citingPatentCount: number; // distinct patents citing the domain's papers
  resolvedPatentCount: number; // how many resolved to an assignee
};

const KIND_CODES = ["-B2", "-B1", "-A1", "-A2", "-A"]; // granted + pre-grant pubs

async function mapLimited<T, R>(items: T[], concurrency: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    out.push(...(await Promise.all(items.slice(i, i + concurrency).map(fn))));
  }
  return out;
}

// Given the domain papers' DOIs, return the firms whose patents cite them.
export async function firmsBuildingOnScience(dois: string[], maxPatents = 250): Promise<CitingFirmsResult> {
  const patents = await citingPatentsByDoi(dois);
  const citingPatentCount = patents.length;
  const use = patents.slice(0, maxPatents);
  const yearOf = new Map(use.map((p) => [p.patent.toUpperCase(), p.filingYear]));

  // Candidate Scientifiq ids: the RoS number with each plausible kind code.
  const candidates = use.flatMap((p) => KIND_CODES.map((k) => p.patent.toUpperCase() + k));

  // Batch-resolve via the patentIDs filter (50/call), a few batches at a time.
  const batches: string[][] = [];
  for (let i = 0; i < candidates.length; i += 50) batches.push(candidates.slice(i, i + 50));
  const results = await mapLimited(batches, 5, (b) => searchPatents({ patentIDs: b, limit: 50 }).then((r) => r.patents).catch(() => []));

  const firmMap = new Map<string, { patents: Set<string>; latestYear?: number }>();
  const resolved = new Set<string>();
  for (const p of results.flat()) {
    const base = String(p.id).replace(/-[A-Z][0-9]?$/, "").toUpperCase(); // strip kind code
    resolved.add(base);
    const yr = yearOf.get(base);
    for (const a of (p.assigneeNames || []).filter(Boolean)) {
      const cur = firmMap.get(a) || { patents: new Set<string>(), latestYear: undefined };
      cur.patents.add(base);
      if (yr && (!cur.latestYear || yr > cur.latestYear)) cur.latestYear = yr;
      firmMap.set(a, cur);
    }
  }

  const firms = [...firmMap.entries()]
    .map(([name, v]) => ({ name, patents: v.patents.size, latestYear: v.latestYear }))
    .sort((a, b) => b.patents - a.patents || (b.latestYear || 0) - (a.latestYear || 0));

  return { firms, citingPatentCount, resolvedPatentCount: resolved.size };
}
