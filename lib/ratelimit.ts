// Lightweight per-user rate limiter for the AI endpoints — a first line against
// token drain. In-memory (per serverless instance): a single user hammering an
// endpoint hits a warm instance and gets capped, with zero migration. It is not
// a distributed quota; for durable cross-instance limits, back it with a table
// or Redis later. Combined with the routes' message-length + history caps, this
// turns "unlimited" into "bounded per user".

type Hits = number[];
const store = new Map<string, Hits>();

// Drop timestamps older than the window; returns the pruned array.
function prune(arr: Hits, windowMs: number, now: number): Hits {
  const cut = now - windowMs;
  let i = 0;
  while (i < arr.length && arr[i] < cut) i++;
  return i ? arr.slice(i) : arr;
}

// One fixed-key sliding-window check. Records the hit when allowed.
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const arr = prune(store.get(key) || [], windowMs, now);
  if (arr.length >= limit) {
    store.set(key, arr);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((arr[0] + windowMs - now) / 1000)) };
  }
  arr.push(now);
  store.set(key, arr);
  // Bound memory: occasionally sweep empty/expired buckets.
  if (store.size > 4000) for (const [k, v] of store) { const p = prune(v, windowMs, now); if (!p.length) store.delete(k); else store.set(k, p); }
  return { ok: true, retryAfter: 0 };
}

export type Limited = { ok: boolean; retryAfter: number };

// Interactive AI (chat, tutor, teach-back grading): frequent but cheap-ish.
export function enforceChatLimit(userId: string): Limited {
  const m = rateLimit(`chat:m:${userId}`, 15, 60_000);
  if (!m.ok) return m;
  return rateLimit(`chat:h:${userId}`, 150, 3_600_000);
}

// Heavy generations (a whole module/explainer/case): rare and expensive.
export function enforceGenerateLimit(userId: string): Limited {
  const m = rateLimit(`gen:m:${userId}`, 4, 60_000);
  if (!m.ok) return m;
  return rateLimit(`gen:h:${userId}`, 30, 3_600_000);
}

// A 429 Response for a blocked request.
export function tooMany(retryAfter: number): Response {
  return Response.json(
    { error: `You're going a bit fast. Try again in ${retryAfter}s.` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
