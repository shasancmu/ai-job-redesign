import { createAdminClient } from "@/lib/supabase/admin";

export type RosterStudent = {
  userId: string;
  name: string;
  classCount: number;      // how many of THIS instructor's classes they've joined
  classNames: string[];
  returning: boolean;      // in 2+ of the instructor's classes across terms
  firstJoined: string | null;
  lastJoined: string | null;
  casesEngaged: number;    // how many of the instructor's living cases they opened
};

export type InstructorRoster = {
  totalStudents: number;
  returning: number;
  students: RosterStudent[];
};

// The instructor's persistent roster across every class they own — the seed of
// cross-semester identity and the alumni graph. A student who shows up in two of
// your classes across terms is flagged "returning": relationship capital that
// only exists because they (and you) stayed on the platform.
export async function instructorRoster(userId: string, caseSlugs: string[] = []): Promise<InstructorRoster> {
  const empty: InstructorRoster = { totalStudents: 0, returning: 0, students: [] };
  let admin;
  try { admin = createAdminClient(); } catch { return empty; }

  const { data: classes } = await admin.from("classes").select("id, name").eq("owner_id", userId);
  const classList = ((classes || []) as any[]).filter((c) => c.id);
  if (!classList.length) return empty;
  const classNameById = new Map(classList.map((c) => [c.id, c.name as string]));

  const { data: members } = await admin.from("class_members").select("class_id, user_id, joined_at").in("class_id", classList.map((c) => c.id)).limit(20000);
  const rows = (members || []) as any[];
  if (!rows.length) return empty;

  // Group memberships by student.
  const byUser = new Map<string, { classIds: Set<string>; joins: string[] }>();
  for (const r of rows) {
    const g = byUser.get(r.user_id) || { classIds: new Set<string>(), joins: [] };
    g.classIds.add(r.class_id);
    if (r.joined_at) g.joins.push(r.joined_at);
    byUser.set(r.user_id, g);
  }
  const userIds = [...byUser.keys()];

  // Names, and case-engagement overlay (distinct cases each opened).
  const [{ data: profs }, { data: events }] = await Promise.all([
    admin.from("profiles").select("id, display_name").in("id", userIds),
    caseSlugs.length ? admin.from("case_events").select("user_id, case_slug").in("case_slug", caseSlugs).in("user_id", userIds).eq("kind", "open").limit(20000) : Promise.resolve({ data: [] as any[] }),
  ]);
  const nameById = new Map(((profs || []) as any[]).map((p) => [p.id, p.display_name as string]));
  const casesByUser = new Map<string, Set<string>>();
  for (const e of ((events || []) as any[])) {
    const s = casesByUser.get(e.user_id) || new Set<string>();
    s.add(e.case_slug); casesByUser.set(e.user_id, s);
  }

  const students: RosterStudent[] = userIds.map((uid) => {
    const g = byUser.get(uid)!;
    const joins = g.joins.sort();
    return {
      userId: uid,
      name: nameById.get(uid) || "Student",
      classCount: g.classIds.size,
      classNames: [...g.classIds].map((id) => classNameById.get(id) || "class").filter(Boolean),
      returning: g.classIds.size >= 2,
      firstJoined: joins[0] || null,
      lastJoined: joins[joins.length - 1] || null,
      casesEngaged: casesByUser.get(uid)?.size || 0,
    };
  }).sort((a, b) => (b.returning ? 1 : 0) - (a.returning ? 1 : 0) || b.classCount - a.classCount || b.casesEngaged - a.casesEngaged);

  return { totalStudents: students.length, returning: students.filter((s) => s.returning).length, students };
}
