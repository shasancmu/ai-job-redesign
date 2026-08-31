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

export async function scoreText(task: string, text: string, timeoutMs = 20000): Promise<ModelScore | null> {
  if (!BASE) return null;
  const t = (text || "").trim();
  if (t.length < 40) return null;
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
}
