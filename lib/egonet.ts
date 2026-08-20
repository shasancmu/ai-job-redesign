// ============================================================================
// Map Your Personal Network — the ego-network statistics engine.
//
// A person names their key contacts (alters), tags each with the world it lives
// in, the tie's strength, and whether it energizes or drains them, then marks
// which contacts know each other. From that we compute the canonical structural
// measures and turn them into feedback grounded in real network science:
//
//   - Burt, Structural Holes (1992): brokerage across disconnected worlds gives
//     access to novel information and control. We compute density, effective
//     size, efficiency, and Burt's CONSTRAINT (how boxed-in the network is).
//   - Granovetter, The Strength of Weak Ties (1973): weak ties bridge to new
//     information; an all-strong network is redundant. We report the tie-strength
//     mix.
//   - Krackhardt, Simmelian ties / closure: cohesion (density) builds trust and
//     gets things executed, the counterweight to brokerage.
//   - Rob Cross, energy networks: who energizes vs. drains you predicts
//     performance and wellbeing more than the org chart. We compute an energy
//     balance and surface energizers to invest in and drainers to manage.
//
// Everything here is a PURE function of the roster + who-knows-whom, so the graph
// and the report render deterministically from the same numbers.
// ============================================================================

export type Domain = "inside" | "outside" | "industry" | "personal";
export type Energy = "energize" | "neutral" | "drain";
export type Strength = 1 | 2 | 3; // weak, medium, strong

export type Contact = {
  id: string;
  name: string;
  domain: Domain;
  strength: Strength;
  energy: Energy;
};

// Which contacts know each other, keyed by a sorted pair of ids so the map is
// symmetric and each undirected tie is stored once.
export type Ties = Record<string, boolean>;

export const DOMAINS: { key: Domain; label: string; blurb: string; color: string }[] = [
  { key: "inside", label: "Inside your org", blurb: "colleagues, your team, other units", color: "#3F7A52" },
  { key: "outside", label: "Outside your org", blurb: "other companies, clients, partners", color: "#3B7FB5" },
  { key: "industry", label: "Field & industry", blurb: "peers in your field, community, alumni", color: "#CE8F2C" },
  { key: "personal", label: "Personal & friends", blurb: "friends, family, mentors, support", color: "#C06A47" },
];

export const STRENGTHS: { key: Strength; label: string }[] = [
  { key: 1, label: "Weak" },
  { key: 2, label: "Medium" },
  { key: 3, label: "Strong" },
];

export const ENERGY: { key: Energy; label: string; emoji: string }[] = [
  { key: "energize", label: "Energizes me", emoji: "⚡" },
  { key: "neutral", label: "Neutral", emoji: "•" },
  { key: "drain", label: "Drains me", emoji: "🪫" },
];

export function domainMeta(key: Domain) {
  return DOMAINS.find((d) => d.key === key) || DOMAINS[0];
}

// Sorted-pair key so a tie is stored once regardless of the order given.
export function tieKey(a: string, b: string): string {
  return a < b ? `${a}${b}` : `${b}${a}`;
}
export function hasTie(ties: Ties, a: string, b: string): boolean {
  return !!ties[tieKey(a, b)];
}

export type BrokerLabel = "brokered" | "balanced" | "closed";

export type EgoMetrics = {
  size: number; // number of alters
  edges: number; // alter-alter ties
  density: number; // 0..1, share of possible alter-alter ties present
  effectiveSize: number; // Burt: non-redundant contacts (n - 2t/n)
  efficiency: number; // effectiveSize / size
  constraint: number; // Burt: how boxed-in the network is (higher = fewer holes)
  clusters: number; // separate "worlds" the alter graph breaks into (isolates count)
  brokerLabel: BrokerLabel;
  domainCounts: Record<Domain, number>;
  domainsPresent: number; // distinct worlds represented (0..4)
  domainDiversity: number; // Blau's index over the four worlds, 0..1
  weak: number;
  medium: number;
  strong: number;
  strongPct: number; // share of ties that are strong
  energizers: number;
  drainers: number;
  neutral: number;
  energyBalance: number; // energizers - drainers
  energizePct: number;
  isolates: { id: string; name: string; domain: Domain }[]; // alters tied to no other alter — each opens a structural hole
  embedded: { id: string; name: string; degree: number }[]; // most-connected alters (redundant / trusted core), top few
};

const EMPTY_DOMAINS: Record<Domain, number> = { inside: 0, outside: 0, industry: 0, personal: 0 };

// Connected components of the alter-alter graph. Isolated alters each form their
// own component, so this counts the number of separate worlds ego spans.
function countClusters(ids: string[], ties: Ties): number {
  const idx = new Map(ids.map((id, i) => [id, i]));
  const parent = ids.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (hasTie(ties, ids[i], ids[j])) union(i, j);
    }
  }
  const roots = new Set(ids.map((_, i) => find(i)));
  return roots.size;
}

export function computeEgoMetrics(contacts: Contact[], ties: Ties): EgoMetrics {
  const alters = contacts.filter((c) => c && c.name && c.name.trim());
  const n = alters.length;
  const ids = alters.map((c) => c.id);

  // Alter-alter edges + each alter's degree within the ego network.
  let edges = 0;
  const deg = new Map<string, number>(ids.map((id) => [id, 0]));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (hasTie(ties, ids[i], ids[j])) {
        edges++;
        deg.set(ids[i], (deg.get(ids[i]) || 0) + 1);
        deg.set(ids[j], (deg.get(ids[j]) || 0) + 1);
      }
    }
  }

  const possible = n > 1 ? (n * (n - 1)) / 2 : 0;
  const density = possible > 0 ? edges / possible : 0;
  // Borgatti's ego-network effective size for dichotomous ties: n − 2t/n. It is
  // the count of contacts left after subtracting redundancy.
  const effectiveSize = n > 0 ? n - (2 * edges) / n : 0;
  const efficiency = n > 0 ? effectiveSize / n : 0;
  const constraint = burtConstraint(alters, ties);
  const clusters = countClusters(ids, ties);

  // Worlds represented.
  const domainCounts = { ...EMPTY_DOMAINS };
  for (const c of alters) domainCounts[c.domain] = (domainCounts[c.domain] || 0) + 1;
  const domainsPresent = (Object.keys(domainCounts) as Domain[]).filter((d) => domainCounts[d] > 0).length;
  let blau = 0;
  if (n > 0) {
    let sumSq = 0;
    for (const d of Object.keys(domainCounts) as Domain[]) sumSq += (domainCounts[d] / n) ** 2;
    blau = 1 - sumSq;
  }

  // Tie strength mix (Granovetter).
  const weak = alters.filter((c) => c.strength === 1).length;
  const medium = alters.filter((c) => c.strength === 2).length;
  const strong = alters.filter((c) => c.strength === 3).length;
  const strongPct = n > 0 ? strong / n : 0;

  // Energy (Rob Cross).
  const energizers = alters.filter((c) => c.energy === "energize").length;
  const drainers = alters.filter((c) => c.energy === "drain").length;
  const neutral = alters.filter((c) => c.energy === "neutral").length;
  const energyBalance = energizers - drainers;
  const energizePct = n > 0 ? energizers / n : 0;

  // Contacts tied to no other contact each open a structural hole (a world only
  // you reach). The most-connected contacts are the redundant, trusted core.
  const isolates = alters
    .filter((c) => (deg.get(c.id) || 0) === 0)
    .map((c) => ({ id: c.id, name: c.name, domain: c.domain }));
  const embedded = alters
    .map((c) => ({ id: c.id, name: c.name, degree: deg.get(c.id) || 0 }))
    .filter((c) => c.degree > 0)
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 3);

  // Overall shape. Density and how fragmented the alter graph is (clusters
  // relative to size) decide whether the network brokers across holes or closes
  // into one cohesive group.
  const spread = n > 1 ? clusters / n : 1; // 1 = all separate worlds, →0 = one blob
  let brokerLabel: BrokerLabel = "balanced";
  if (n >= 3) {
    if (density >= 0.6 || (clusters <= 1 && n >= 4)) brokerLabel = "closed";
    else if (density <= 0.34 && spread >= 0.5) brokerLabel = "brokered";
  }

  return {
    size: n,
    edges,
    density,
    effectiveSize,
    efficiency,
    constraint,
    clusters,
    brokerLabel,
    domainCounts,
    domainsPresent,
    domainDiversity: blau,
    weak,
    medium,
    strong,
    strongPct,
    energizers,
    drainers,
    neutral,
    energyBalance,
    energizePct,
    isolates,
    embedded,
  };
}

// Burt's constraint for the ego. Nodes are ego (connected to every alter with a
// weight equal to the named tie strength) plus the alters (connected to each
// other with weight 1 where a tie exists). p_ij is the share of i's connection
// invested in j; constraint sums, over each alter j, (p_ej + Σ_q p_eq·p_qj)²,
// the degree to which ego's investment in j is echoed through shared contacts q.
// Higher constraint = a more closed network with fewer structural holes.
function burtConstraint(alters: Contact[], ties: Ties): number {
  const n = alters.length;
  if (n < 2) return n === 1 ? 1 : 0;
  // Weight matrix over [ego, ...alters].
  const N = n + 1;
  const z: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let a = 0; a < n; a++) {
    const w = alters[a].strength; // ego↔alter weight
    z[0][a + 1] = w;
    z[a + 1][0] = w;
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (hasTie(ties, alters[i].id, alters[j].id)) {
        z[i + 1][j + 1] = 1;
        z[j + 1][i + 1] = 1;
      }
    }
  }
  const rowSum = z.map((row) => row.reduce((s, v) => s + v, 0));
  const p = (i: number, j: number) => (rowSum[i] > 0 ? z[i][j] / rowSum[i] : 0);

  let constraint = 0;
  for (let a = 1; a <= n; a++) {
    if (z[0][a] === 0) continue;
    let indirect = 0;
    for (let q = 1; q <= n; q++) {
      if (q === a) continue;
      indirect += p(0, q) * p(q, a);
    }
    const c = p(0, a) + indirect;
    constraint += c * c;
  }
  return constraint;
}

// ---- Interpretation helpers shared by the report tiles ---------------------

export function brokerMeta(label: BrokerLabel): { title: string; blurb: string; chip: string } {
  switch (label) {
    case "brokered":
      return {
        title: "Brokered / open",
        blurb: "Your contacts don't all know each other, so you span separate worlds. That's an information and opportunity advantage (Burt's structural holes), at the cost of a tighter support core.",
        chip: "bg-sky-soft text-sky",
      };
    case "closed":
      return {
        title: "Closed / cohesive",
        blurb: "Most of your contacts know each other. That builds trust and gets things done (closure), but the same information circulates, and few new opportunities reach you.",
        chip: "bg-amber-soft text-amber",
      };
    default:
      return {
        title: "Balanced",
        blurb: "You mix a cohesive core with a few bridges to other worlds, some trust, some reach.",
        chip: "bg-sage-soft text-sage",
      };
  }
}

// A qualitative read of Burt constraint, which scales roughly 0 (many holes) to
// ~1+ (very boxed in). Thresholds are for guidance, not precision.
export function constraintBand(c: number): "low" | "moderate" | "high" {
  if (c <= 0.35) return "low";
  if (c >= 0.6) return "high";
  return "moderate";
}
