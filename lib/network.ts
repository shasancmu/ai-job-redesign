// ============================================================================
// Social-network analysis helpers (pure, server-side).
// Directed graphs: an edge s→t means "s nominated t" (goes to t for advice /
// considers t a friend). In-degree = how many people nominated you.
// ============================================================================

export type RosterEntry = { id: string; name: string };
export type Response = { self_id: string; advice: string[]; friends: string[] };
export type Edge = { s: string; t: string; strong: boolean };

// Build directed edges for one field, marking reciprocated pairs as "strong".
export function buildEdges(
  responses: Response[],
  field: "advice" | "friends",
  validIds: Set<string>
): Edge[] {
  const set = new Set<string>();
  for (const r of responses) {
    if (!r.self_id || !validIds.has(r.self_id)) continue;
    for (const t of r[field] || []) {
      if (t && t !== r.self_id && validIds.has(t)) set.add(`${r.self_id}|${t}`);
    }
  }
  return Array.from(set).map((k) => {
    const [s, t] = k.split("|");
    return { s, t, strong: set.has(`${t}|${s}`) };
  });
}

export function inDegree(edges: Edge[], ids: string[]): Map<string, number> {
  const deg = new Map<string, number>(ids.map((id) => [id, 0]));
  for (const e of edges) deg.set(e.t, (deg.get(e.t) || 0) + 1);
  return deg;
}

// Brandes' algorithm — betweenness centrality for a directed, unweighted graph.
export function betweenness(edges: Edge[], ids: string[]): Map<string, number> {
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of edges) adj.get(e.s)?.push(e.t);

  const CB = new Map<string, number>(ids.map((id) => [id, 0]));

  for (const s of ids) {
    const S: string[] = [];
    const P = new Map<string, string[]>(ids.map((id) => [id, []]));
    const sigma = new Map<string, number>(ids.map((id) => [id, 0]));
    const dist = new Map<string, number>(ids.map((id) => [id, -1]));
    sigma.set(s, 1);
    dist.set(s, 0);
    const Q: string[] = [s];
    while (Q.length) {
      const v = Q.shift()!;
      S.push(v);
      for (const w of adj.get(v) || []) {
        if (dist.get(w)! < 0) {
          dist.set(w, dist.get(v)! + 1);
          Q.push(w);
        }
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          P.get(w)!.push(v);
        }
      }
    }
    const delta = new Map<string, number>(ids.map((id) => [id, 0]));
    while (S.length) {
      const w = S.pop()!;
      for (const v of P.get(w)!) {
        delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      }
      if (w !== s) CB.set(w, CB.get(w)! + delta.get(w)!);
    }
  }
  return CB;
}

export function topN(
  scores: Map<string, number>,
  nameOf: (id: string) => string,
  n = 5
): { name: string; value: number }[] {
  return Array.from(scores.entries())
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id, v]) => ({ name: nameOf(id), value: Math.round(v * 10) / 10 }));
}
