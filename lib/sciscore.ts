// ============================================================================
// sciscore client — call the SciBERT/BERT estimator service (see /ml).
//
// The service scores raw text for any trained task (defense_impact, …). It's the
// real estimator: a linear head on frozen SciBERT embeddings. This client is
// deliberately forgiving — if the service is unset, down, or slow, it returns
// null and the caller falls back to the AI estimate, so nothing ever breaks.
// Server-only (the API key must not reach the browser).
// ============================================================================

const BASE = (process.env.SCISCORE_URL || "").replace(/\/$/, "");
export const SCISCORE_ENABLED = !!BASE;

export type ModelScore = { score: number; stars: number };

// ---------------------------------------------------------------------------
// Serialize every network call to the model service — one in flight at a time.
//
// The service scales to zero and runs on a single small instance: the first
// request cold-loads the shared SciBERT base (~30s). If several task requests
// (complex_invention, interdisciplinary, defense_impact) hit it AT ONCE — via a
// caller's Promise.all — they contend during that load and some come back empty
// and get silently dropped (the classic "only one deeper score renders" bug).
// Queuing them means the first request warms the base and the rest return in
// well under a second, so every caller is safe regardless of how it invokes us.
// On a warm service each call is sub-second, so the queue adds negligible latency.
// ---------------------------------------------------------------------------
let gate: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = gate.then(fn, fn);
  gate = run.then(() => {}, () => {}); // keep the chain alive; never let a rejection break it
  return run;
}

// Score many texts for one task in a single request (the service accepts a
// `texts` array and returns aligned results). Returns one entry per input,
// null where the service failed or gave no score.
export async function scoreTextBatch(task: string, texts: string[], timeoutMs = 90000): Promise<(ModelScore | null)[]> {
  if (!BASE || texts.length === 0) return texts.map(() => null);

  const attempt = async (): Promise<(ModelScore | null)[] | null> => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(`${BASE}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(process.env.SCISCORE_API_KEY ? { Authorization: `Bearer ${process.env.SCISCORE_API_KEY}` } : {}) },
        body: JSON.stringify({ task, texts }),
        signal: ctl.signal,
        cache: "no-store",
      });
      if (!res.ok) return null;
      const j = await res.json();
      const results: any[] = Array.isArray(j?.results) ? j.results : [];
      return texts.map((_, i) => {
        const s = results[i]?.score;
        if (typeof s !== "number" || Number.isNaN(s)) return null;
        return { score: s, stars: typeof results[i]?.stars === "number" ? results[i].stars : Math.max(1, Math.min(5, Math.round(s * 5))) };
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const t0 = Date.now();
  const first = await serialize(attempt);
  // Retry only a FAST whole-batch failure (a transient empty response while the base
  // was warming); a genuine timeout must not double and blow the caller's budget.
  if (!first && Date.now() - t0 <= 12000) {
    await new Promise((r) => setTimeout(r, 500));
    const second = await serialize(attempt);
    if (second) return second;
  }
  return first || texts.map(() => null);
}

// Default timeout must comfortably outlast a full cold boot. A scale-to-zero
// Cloud Run instance holds the request while it starts the container AND loads
// the shared SciBERT base — that can take 45-70s on the very first call. A 45s
// window aborted mid-boot and silently dropped that dimension (the classic "only
// one deeper score renders" bug: the first, cold call times out; the next one,
// now warm, returns instantly). 90s covers the cold boot; because calls are
// serialized only the first is ever slow, so three sequential calls stay well
// inside the route's 300s budget. One retry still recovers a transient cold miss.
export async function scoreText(task: string, text: string, timeoutMs = 90000): Promise<ModelScore | null> {
  if (!BASE) return null;
  const t = (text || "").trim();
  if (t.length < 40) return null;

  const attempt = async (): Promise<ModelScore | null> => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(`${BASE}/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.SCISCORE_API_KEY ? { Authorization: `Bearer ${process.env.SCISCORE_API_KEY}` } : {}),
        },
        body: JSON.stringify({ task, text: t }),
        signal: ctl.signal,
        cache: "no-store",
      });
      if (!res.ok) return null;
      const j = await res.json();
      const s = typeof j?.score === "number" ? j.score : j?.results?.[0]?.score;
      if (typeof s !== "number" || Number.isNaN(s)) return null;
      const stars = typeof j?.stars === "number" ? j.stars : Math.max(1, Math.min(5, Math.round(s * 5)));
      return { score: s, stars };
    } catch {
      return null; // unset / down / timeout → caller falls back
    } finally {
      clearTimeout(timer);
    }
  };

  const t0 = Date.now();
  const first = await serialize(attempt);
  if (first) return first;
  // Only retry a FAST failure (a transient empty response while the base was warming).
  // If the first attempt burned the full timeout, retrying would double the wait and
  // blow the caller's function budget — so give up and let the caller fall back.
  if (Date.now() - t0 > 12000) return null;
  await new Promise((r) => setTimeout(r, 500));
  return serialize(attempt);
}
