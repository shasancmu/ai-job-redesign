// ============================================================================
// The Relationship OS, re-architected around the relationship-vs-transaction
// doctrine (see memory: project-relationship-vs-transaction). It is NOT a
// network-health report and NOT a mailing-list segmenter. It is an instrument
// of CARE, built to these principles:
//
//  1. Carriage, not substitution — it carries human relationships, never stands
//     in for one. It surfaces and routes; a human always gives.
//  2. Every person is known by a human — the hero question is "who carries this
//     person?", and anyone carried only by the system is a coverage GAP.
//  3. Respect the span budget — no carer is asked to hold more people than a
//     human can (the Dunbar layers). Over the ceiling is flagged, not hidden.
//  4. Add capacity with humans, not leverage — the prescription for overload is
//     another carer, never automation.
//  5. Care recurses — a director carries program directors, who carry
//     instructors, who carry students. This reads the viewer's OWN span only.
//  7. Peers are the scale escape — surface who already helps peers (to thank,
//     not "activate") and who no peer has welcomed yet (to introduce).
// ============================================================================
import { moduleByExercise } from "@/lib/modules";
import type { RoleInfo } from "@/lib/orgs";

const DAY = 86_400_000;
const cap = <T,>(a: T[], n = 4000): T[] => (a.length > n ? a.slice(0, n) : a);

// Human-scale limits on how many people ONE person can relationally carry.
// Grounded in the Dunbar layers (~15 sympathy group, ~50 close, ~150 meaningful)
// and span-of-control. Past HEALTHY a carer is stretched; past MAX the tie
// necessarily thins toward transaction — the fix is another human (principle 4).
export const SPAN_HEALTHY = 50;
export const SPAN_MAX = 150;

export type ViewerRole = "director" | "program_director" | "instructor";
export type CareBucket = "strong" | "cooling" | "at_risk" | "dormant";

function bucketFor(lastDays: number | null): CareBucket {
  if (lastDays == null) return "dormant";
  if (lastDays <= 30) return "strong";
  if (lastDays <= 90) return "cooling";
  if (lastDays <= 180) return "at_risk";
  return "dormant";
}

export type Carrier = { userId: string; name: string };

export type CarePerson = {
  userId: string;
  name: string;
  lastActiveDays: number | null;
  bucket: CareBucket;
  lastModule: string | null;      // context for the carer (memory prosthetic)
  carriedBy: Carrier[];           // the human(s) who know them
  peerDegree: number;             // how many peers they've worked with
};

export type Carer = {
  userId: string;
  name: string;
  load: number;                   // distinct people they carry
  status: "healthy" | "stretched" | "over";
  cohorts: string[];
  present: boolean;               // still on staff (else their people need handoff)
};

export type ProgramNode = {
  unitId: string;
  name: string;
  directors: Carrier[];
  carers: number;
  people: number;
  covered: number;
};

export type SuccessionItem = { cohort: string; carerName: string | null; people: number; reason: string };

export type CareOS = {
  role: ViewerRole;
  spanLabel: string;
  programs: ProgramNode[];
  people: number;
  covered: number;
  coverage: number;               // 0..1 — carried by a human
  orphaned: CarePerson[];         // carried only by the system (the gap)
  carers: Carer[];
  overloaded: Carer[];            // beyond human scale
  needsPerson: CarePerson[];      // cooling/at-risk AND carried → route to their carer
  succession: SuccessionItem[];
  helpfulPeers: CarePerson[];     // already help their peers — recognize
  unwelcomed: CarePerson[];       // no peer has connected with them yet
  memberIds: string[];            // everyone in span (server-side, for roll-ups)
};

// Resolve the viewer's role for this org and the slice of the tree they carry.
function resolveViewerRole(role: RoleInfo, orgId: string): ViewerRole {
  if (role.superadmin || role.directorOrgIds.includes(orgId)) return "director";
  if (role.programDirectorOrgIds.includes(orgId)) return "program_director";
  return "instructor";
}

export async function gatherCareOS(
  admin: any,
  org: { id: string; name: string; owner_id?: string | null },
  role: RoleInfo,
  userId: string
): Promise<CareOS> {
  const now = Date.now();
  const viewer = resolveViewerRole(role, org.id);

  // The whole org tree, then narrow to the viewer's span.
  const { data: unitRows } = await admin.from("class_units").select("id, name, is_default").eq("org_id", org.id);
  const { data: cohortRows } = await admin.from("classes").select("id, code, name, owner_id, class_unit_id, is_default").eq("org_id", org.id);
  const allUnits = ((unitRows as any[]) || []).filter(Boolean);
  const allCohorts = ((cohortRows as any[]) || []).filter(Boolean);

  // Program directors, per program (the middle tier).
  const { data: pdRows } = await admin.from("program_directors").select("class_unit_id, user_id").eq("org_id", org.id);
  const directorsByUnit = new Map<string, string[]>();
  for (const r of ((pdRows as any[]) || [])) {
    if (!directorsByUnit.has(r.class_unit_id)) directorsByUnit.set(r.class_unit_id, []);
    directorsByUnit.get(r.class_unit_id)!.push(r.user_id);
  }

  // Narrow to span.
  let spanUnitIds: Set<string>;
  let spanCohorts: any[];
  if (viewer === "director") {
    spanUnitIds = new Set(allUnits.map((u) => u.id));
    spanCohorts = allCohorts;
  } else if (viewer === "program_director") {
    spanUnitIds = new Set(role.programDirectorUnitIds.filter((id) => allUnits.some((u) => u.id === id)));
    spanCohorts = allCohorts.filter((c) => c.class_unit_id && spanUnitIds.has(c.class_unit_id));
  } else {
    spanCohorts = allCohorts.filter((c) => c.owner_id === userId);
    spanUnitIds = new Set(spanCohorts.map((c) => c.class_unit_id).filter(Boolean));
  }
  const spanUnits = allUnits.filter((u) => spanUnitIds.has(u.id));

  // A "carrying" cohort is a real (non-default) cohort with an instructor owner.
  // The default/master cohort carries no one — being only there = system-carried.
  const carryingCohorts = spanCohorts.filter((c) => !c.is_default && c.owner_id);
  const spanCohortIds = cap(spanCohorts.map((c) => c.id));
  const spanCohortCodes = cap(spanCohorts.map((c) => c.code).filter(Boolean));

  // Members of the span's cohorts, and which cohorts each belongs to.
  const cohortsByMember = new Map<string, string[]>(); // userId -> cohortIds
  const memberSet = new Set<string>();
  if (spanCohortIds.length) {
    const { data: cms } = await admin.from("class_members").select("user_id, class_id").in("class_id", spanCohortIds);
    for (const r of ((cms as any[]) || [])) {
      memberSet.add(r.user_id);
      if (!cohortsByMember.has(r.user_id)) cohortsByMember.set(r.user_id, []);
      cohortsByMember.get(r.user_id)!.push(r.class_id);
    }
  }
  const memberIds = cap([...memberSet]);

  // Who is still on staff (a cohort owner who's gone → their people need a handoff).
  const { data: omRows } = await admin.from("org_members").select("user_id").eq("org_id", org.id);
  const staffOrMember = new Set<string>(((omRows as any[]) || []).map((r) => r.user_id));

  // Names for everyone we'll show: members, cohort owners, program directors.
  const ownerIds = carryingCohorts.map((c) => c.owner_id).filter(Boolean);
  const pdIds = [...directorsByUnit.values()].flat();
  const nameIds = cap([...new Set([...memberIds, ...ownerIds, ...pdIds])]);
  const nameById = new Map<string, string>();
  if (nameIds.length) {
    const { data: profs } = await admin.from("profiles").select("id, display_name").in("id", nameIds);
    for (const p of ((profs as any[]) || [])) nameById.set(p.id, p.display_name || "Member");
  }
  const nm = (id: string) => nameById.get(id) || "Member";

  // Activity + peer graph + last module, from the span's cohort-tagged sessions.
  const lastActive = new Map<string, number>();
  const lastModuleName = new Map<string, string>();
  const peers = new Map<string, Set<string>>();
  if (spanCohortCodes.length) {
    const { data: sess } = await admin
      .from("sessions").select("host_id, guest_id, exercise, created_at, cohort")
      .in("cohort", spanCohortCodes).order("created_at", { ascending: false }).limit(50000);
    for (const s of ((sess as any[]) || [])) {
      const ts = s.created_at ? new Date(s.created_at).getTime() : 0;
      for (const uid of [s.host_id, s.guest_id]) {
        if (!uid || !memberSet.has(uid)) continue;
        if (ts > (lastActive.get(uid) || 0)) {
          lastActive.set(uid, ts);
          const mod = moduleByExercise(s.exercise);
          if (mod?.name) lastModuleName.set(uid, mod.name);
        }
      }
      if (s.host_id && s.guest_id && memberSet.has(s.host_id) && memberSet.has(s.guest_id) && s.host_id !== s.guest_id) {
        if (!peers.has(s.host_id)) peers.set(s.host_id, new Set());
        if (!peers.has(s.guest_id)) peers.set(s.guest_id, new Set());
        peers.get(s.host_id)!.add(s.guest_id);
        peers.get(s.guest_id)!.add(s.host_id);
      }
    }
  }

  // Carrier(s) per member = owner(s) of the non-default cohorts they're in.
  const ownerByCohort = new Map<string, string>(carryingCohorts.map((c) => [c.id, c.owner_id]));
  const carryingCohortIds = new Set(carryingCohorts.map((c) => c.id));

  const people: CarePerson[] = memberIds.map((id) => {
    const ts = lastActive.get(id);
    const lastDays = ts ? Math.floor((now - ts) / DAY) : null;
    const carrierIds = new Set<string>();
    for (const cid of (cohortsByMember.get(id) || [])) {
      if (carryingCohortIds.has(cid)) { const o = ownerByCohort.get(cid); if (o) carrierIds.add(o); }
    }
    return {
      userId: id, name: nm(id), lastActiveDays: lastDays, bucket: bucketFor(lastDays),
      lastModule: lastModuleName.get(id) || null,
      carriedBy: [...carrierIds].map((o) => ({ userId: o, name: nm(o) })),
      peerDegree: peers.get(id)?.size || 0,
    };
  });

  const byId = new Map(people.map((p) => [p.userId, p]));
  const covered = people.filter((p) => p.carriedBy.length > 0).length;
  const orphaned = people.filter((p) => p.carriedBy.length === 0 && p.bucket !== "dormant")
    .sort((a, b) => (a.lastActiveDays ?? 1e9) - (b.lastActiveDays ?? 1e9));

  // Carers: distinct people each instructor carries, vs the human-scale ceiling.
  const carriedByCarer = new Map<string, Set<string>>();
  const cohortsByCarer = new Map<string, Set<string>>();
  for (const c of carryingCohorts) {
    if (!carriedByCarer.has(c.owner_id)) { carriedByCarer.set(c.owner_id, new Set()); cohortsByCarer.set(c.owner_id, new Set()); }
    cohortsByCarer.get(c.owner_id)!.add(c.name);
  }
  for (const p of people) for (const cr of p.carriedBy) carriedByCarer.get(cr.userId)?.add(p.userId);
  const carers: Carer[] = [...carriedByCarer.entries()].map(([id, set]) => {
    const load = set.size;
    return {
      userId: id, name: nm(id), load,
      status: (load > SPAN_MAX ? "over" : load > SPAN_HEALTHY ? "stretched" : "healthy") as Carer["status"],
      cohorts: [...(cohortsByCarer.get(id) || [])],
      present: staffOrMember.has(id),
    };
  }).sort((a, b) => b.load - a.load);
  const overloaded = carers.filter((c) => c.status !== "healthy");

  // Who needs a PERSON now: slipping AND already carried → route to their carer.
  const needsPerson = people
    .filter((p) => (p.bucket === "cooling" || p.bucket === "at_risk") && p.carriedBy.length > 0)
    .sort((a, b) => (a.bucket === b.bucket ? (a.lastActiveDays ?? 0) - (b.lastActiveDays ?? 0) : a.bucket === "cooling" ? -1 : 1))
    .slice(0, 25);

  // Succession: a carrying cohort whose owner has left → their people need a human.
  const succession: SuccessionItem[] = [];
  for (const c of carryingCohorts) {
    if (!staffOrMember.has(c.owner_id)) {
      const n = people.filter((p) => (cohortsByMember.get(p.userId) || []).includes(c.id)).length;
      succession.push({ cohort: c.name, carerName: nameById.get(c.owner_id) || null, people: n, reason: "Their instructor has left the school — hand these people to someone." });
    }
  }
  if (orphaned.length) succession.push({ cohort: "Unassigned", carerName: null, people: orphaned.length, reason: "In the school but in no one's cohort — no human carries them yet." });

  // Peers (principle 7): who already helps peers (recognize), who's unwelcomed.
  const helpfulPeers = [...people].filter((p) => p.peerDegree > 0 && p.bucket !== "dormant")
    .sort((a, b) => b.peerDegree - a.peerDegree).slice(0, 10);
  const unwelcomed = people.filter((p) => p.peerDegree === 0 && p.bucket !== "dormant")
    .sort((a, b) => (a.lastActiveDays ?? 1e9) - (b.lastActiveDays ?? 1e9)).slice(0, 12);

  // Program nodes (recursion of specializing-in-people).
  const programs: ProgramNode[] = spanUnits.filter((u) => !u.is_default).map((u) => {
    const cohortsHere = carryingCohorts.filter((c) => c.class_unit_id === u.id);
    const cohortIdsHere = new Set(cohortsHere.map((c) => c.id));
    const peopleHere = people.filter((p) => (cohortsByMember.get(p.userId) || []).some((cid) => cohortIdsHere.has(cid)));
    const carerSet = new Set(cohortsHere.map((c) => c.owner_id).filter(Boolean));
    return {
      unitId: u.id, name: u.name,
      directors: (directorsByUnit.get(u.id) || []).map((id) => ({ userId: id, name: nm(id) })),
      carers: carerSet.size, people: peopleHere.length,
      covered: peopleHere.filter((p) => p.carriedBy.length > 0).length,
    };
  }).sort((a, b) => b.people - a.people);

  const nCarers = carers.length;
  const spanLabel = viewer === "instructor"
    ? `${carryingCohorts.length} cohort${carryingCohorts.length === 1 ? "" : "s"} · ${people.length} ${people.length === 1 ? "person" : "people"} you carry`
    : `${programs.length} program${programs.length === 1 ? "" : "s"} · ${nCarers} carer${nCarers === 1 ? "" : "s"} · ${people.length} ${people.length === 1 ? "person" : "people"}`;

  return {
    role: viewer, spanLabel, programs,
    people: people.length, covered, coverage: people.length ? covered / people.length : 1,
    orphaned: orphaned.slice(0, 20), carers, overloaded, needsPerson, succession,
    helpfulPeers, unwelcomed, memberIds,
  };
}
