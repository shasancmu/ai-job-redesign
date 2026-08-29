// The Relationship OS — the director's instrument for running the ongoing
// relationship with a cohort/org, grounded in three lenses:
//  • Network theory: the cohort is a graph. Paired exercises are edges. We read
//    degree (embeddedness), isolates (churn risk), connectors (brokers who move
//    value + referrals), and density (how connected the whole cohort is).
//  • Relationship science: a tie strengthens with recency + frequency +
//    reciprocity/contribution, and decays with silence. We score each person's
//    tie to the program and catch decay EARLY (cooling), not after it's dead.
//  • Game theory: sustaining a relationship is a repeated cooperation game. The
//    director's move is to invest value (deposits) where cooperation is decaying
//    and to activate brokers — never to extract before value is banked.

const DAY = 86_400_000;

export type Bucket = "strong" | "cooling" | "at_risk" | "dormant";

export type MemberState = {
  userId: string;
  name: string;
  lastActiveDays: number | null; // days since last activity; null = never active
  runs: number;                  // exercises run in the org's cohorts
  degree: number;                // distinct peers they've worked with (paired)
  bucket: Bucket;
};

export type RelationshipOS = {
  members: number;
  active: number;
  edges: number;                 // distinct peer connections
  density: number;               // 0..1: actual edges / possible edges
  avgDegree: number;
  isolates: MemberState[];       // no peer connections yet — bridge them in
  connectors: MemberState[];     // highest-degree brokers — activate them
  buckets: Record<Bucket, number>;
  reengage: MemberState[];       // cooling/at-risk, most worth saving first
  states: MemberState[];         // everyone, strongest tie first
};

function bucketFor(lastDays: number | null): Bucket {
  if (lastDays == null) return "dormant";
  if (lastDays <= 30) return "strong";
  if (lastDays <= 90) return "cooling";
  if (lastDays <= 180) return "at_risk";
  return "dormant";
}

const cap = <T,>(a: T[], n = 4000): T[] => (a.length > n ? a.slice(0, n) : a);

export async function gatherRelationshipOS(admin: any, org: { id: string; name: string }): Promise<RelationshipOS> {
  const now = Date.now();

  // Cohorts + members (the population).
  const { data: classes } = await admin.from("classes").select("id, code").eq("org_id", org.id);
  const cohortRows = ((classes as any[]) || []).filter(Boolean);
  const classIds = cohortRows.map((c) => c.id);
  const cohortCodes = cohortRows.map((c) => c.code);

  const memberSet = new Set<string>();
  if (classIds.length) {
    const { data: cms } = await admin.from("class_members").select("user_id").in("class_id", cap(classIds));
    for (const r of (cms as any[]) || []) memberSet.add(r.user_id);
  }
  const memberIds = cap([...memberSet]);
  const nameById = new Map<string, string>();
  if (memberIds.length) {
    const { data: profs } = await admin.from("profiles").select("id, display_name").in("id", memberIds);
    for (const p of (profs as any[]) || []) nameById.set(p.id, p.display_name || "Member");
  }

  // Activity + the interaction graph, from the org's cohort-tagged sessions.
  const lastActive = new Map<string, number>(); // ms timestamp
  const runCount = new Map<string, number>();
  const peers = new Map<string, Set<string>>(); // adjacency
  const link = (a: string, b: string) => {
    if (!a || !b || a === b) return;
    if (!peers.has(a)) peers.set(a, new Set());
    if (!peers.has(b)) peers.set(b, new Set());
    peers.get(a)!.add(b);
    peers.get(b)!.add(a);
  };
  if (cohortCodes.length) {
    const { data: sess } = await admin
      .from("sessions")
      .select("host_id, guest_id, created_at, cohort")
      .in("cohort", cap(cohortCodes))
      .limit(50000);
    for (const s of (sess as any[]) || []) {
      const ts = s.created_at ? new Date(s.created_at).getTime() : 0;
      for (const uid of [s.host_id, s.guest_id]) {
        if (!uid || !memberSet.has(uid)) continue;
        runCount.set(uid, (runCount.get(uid) || 0) + 1);
        if (ts > (lastActive.get(uid) || 0)) lastActive.set(uid, ts);
      }
      // A paired session is an edge between two members of this org.
      if (s.host_id && s.guest_id && memberSet.has(s.host_id) && memberSet.has(s.guest_id)) {
        link(s.host_id, s.guest_id);
      }
    }
  }

  const states: MemberState[] = memberIds.map((id) => {
    const ts = lastActive.get(id);
    const lastDays = ts ? Math.floor((now - ts) / DAY) : null;
    return {
      userId: id,
      name: nameById.get(id) || "Member",
      lastActiveDays: lastDays,
      runs: runCount.get(id) || 0,
      degree: peers.get(id)?.size || 0,
      bucket: bucketFor(lastDays),
    };
  });

  // Strongest tie first: recent + engaged + embedded.
  const strength = (m: MemberState) => (m.lastActiveDays == null ? -9999 : -m.lastActiveDays) + m.runs * 2 + m.degree * 3;
  states.sort((a, b) => strength(b) - strength(a));

  const buckets: Record<Bucket, number> = { strong: 0, cooling: 0, at_risk: 0, dormant: 0 };
  for (const m of states) buckets[m.bucket]++;

  // Network metrics.
  const n = memberIds.length;
  let edgeSum = 0;
  for (const s of peers.values()) edgeSum += s.size;
  const edges = edgeSum / 2;
  const density = n > 1 ? edges / ((n * (n - 1)) / 2) : 0;
  const avgDegree = n ? (2 * edges) / n : 0;

  // Isolates: no peer tie yet, but they've shown up (activity) — worth bridging.
  const isolates = states.filter((m) => m.degree === 0 && m.bucket !== "dormant").slice(0, 30);
  // Connectors: the brokers who carry value + referrals across the cohort.
  const connectors = [...states].filter((m) => m.degree > 0).sort((a, b) => b.degree - a.degree).slice(0, 12);
  // Re-engage: cooling first (catch decay early), then at-risk; most-banked first.
  const reengage = states
    .filter((m) => m.bucket === "cooling" || m.bucket === "at_risk")
    .sort((a, b) => {
      if (a.bucket !== b.bucket) return a.bucket === "cooling" ? -1 : 1;
      return b.runs + b.degree - (a.runs + a.degree);
    })
    .slice(0, 30);

  return {
    members: n,
    active: states.filter((m) => m.lastActiveDays != null).length,
    edges,
    density,
    avgDegree,
    isolates,
    connectors,
    buckets,
    reengage,
    states,
  };
}
