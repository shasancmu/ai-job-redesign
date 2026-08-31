// ============================================================================
// Batch scoring — score many abstracts across every potential at once.
//
// The sciscore models (defense / complex / interdisciplinary) score the whole
// batch in one request each; the base Scientifiq scores (commercial / scientific
// / social) are per-abstract, run with a small concurrency cap. Output is one
// row per input with the full six-dimensional impact fingerprint. Server-only.
// ============================================================================

import { scoreAbstract } from "./scientifiq";
import { scoreTextBatch } from "./sciscore";

export type BatchRow = {
  id: string;
  commercial: number; scientific: number; social: number;
  interdisciplinary: number; complex_invention: number;
  defense?: number;
};

async function mapLimited<T, R>(items: T[], concurrency: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    out.push(...(await Promise.all(items.slice(i, i + concurrency).map((x, j) => fn(x, i + j)))));
  }
  return out;
}

const pct = (x: any) => Math.round((x?.raw ?? 0) * 100);

export async function batchScore(items: { id: string; text: string }[], opts: { includeDefense?: boolean } = {}): Promise<BatchRow[]> {
  const texts = items.map((it) => it.text);
  const [intd, cplx, def, base] = await Promise.all([
    scoreTextBatch("interdisciplinary", texts),
    scoreTextBatch("complex_invention", texts),
    opts.includeDefense ? scoreTextBatch("defense_impact", texts) : Promise.resolve(texts.map(() => null)),
    mapLimited(items, 6, async (it) => { try { return await scoreAbstract(it.text); } catch { return null; } }),
  ]);

  return items.map((it, i) => {
    const b = base[i] as any;
    const row: BatchRow = {
      id: it.id,
      commercial: b ? pct(b.commercial) : -1,
      scientific: b ? pct(b.scientific) : -1,
      social: b ? pct(b.social) : -1,
      interdisciplinary: intd[i] ? Math.round(intd[i]!.score * 100) : -1,
      complex_invention: cplx[i] ? Math.round(cplx[i]!.score * 100) : -1,
    };
    if (opts.includeDefense) row.defense = def[i] ? Math.round(def[i]!.score * 100) : -1;
    return row;
  });
}
