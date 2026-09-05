// Post-publish assignment: make a module available to the places an instructor
// controls. Writing a module's slug into a cohort's `classes.modules` is what
// surfaces it to that cohort's learners (see dashboard classAssignments); writing
// it into a `class_units.modules` makes it available program/org-wide (every
// cohort under that unit inherits it). Permission-scoped: you can only assign to
// classes you own and to programs of orgs you direct.

import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";

export type AssignTarget = { id: string; label: string; code?: string; kind: "class" | "unit" };
export type AssignTargets = { classes: AssignTarget[]; units: AssignTarget[] };

// The classes + programs a user may assign to, given their role.
export async function assignableTargets(user: { id: string; email?: string | null }): Promise<AssignTargets> {
  const empty: AssignTargets = { classes: [], units: [] };
  let admin;
  try { admin = createAdminClient(); } catch { return empty; }

  const { data: classes } = await admin.from("classes").select("id, code, name, is_default").eq("owner_id", user.id);
  const classTargets: AssignTarget[] = ((classes || []) as any[])
    .filter((c) => c.id && !c.is_default)
    .map((c) => ({ id: c.id, label: c.name || c.code, code: c.code, kind: "class" as const }));

  // Programs (class_units) org-wide, only for orgs the user directs.
  let unitTargets: AssignTarget[] = [];
  try {
    const role = await roleFor(user);
    const orgIds = role.directorOrgIds || [];
    if (orgIds.length) {
      const [{ data: units }, { data: orgs }] = await Promise.all([
        admin.from("class_units").select("id, name, org_id").in("org_id", orgIds),
        admin.from("organizations").select("id, name").in("id", orgIds),
      ]);
      const orgName = new Map(((orgs || []) as any[]).map((o) => [o.id, o.name]));
      unitTargets = ((units || []) as any[]).filter((u) => u.id).map((u) => ({ id: u.id, label: `${u.name} · ${orgName.get(u.org_id) || "org"}`, kind: "unit" as const }));
    }
  } catch { /* no org context */ }

  return { classes: classTargets, units: unitTargets };
}

// Which of a user's targets already have this module assigned.
export async function currentAssignment(slug: string, targets: AssignTargets): Promise<{ classIds: string[]; unitIds: string[] }> {
  let admin;
  try { admin = createAdminClient(); } catch { return { classIds: [], unitIds: [] }; }
  const classIds = targets.classes.map((c) => c.id);
  const unitIds = targets.units.map((u) => u.id);
  const [cls, uns] = await Promise.all([
    classIds.length ? admin.from("classes").select("id, modules").in("id", classIds) : Promise.resolve({ data: [] as any[] }),
    unitIds.length ? admin.from("class_units").select("id, modules").in("id", unitIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const has = (mods: any) => Array.isArray(mods) && mods.map(String).includes(slug);
  return {
    classIds: ((cls.data || []) as any[]).filter((r) => has(r.modules)).map((r) => r.id),
    unitIds: ((uns.data || []) as any[]).filter((r) => has(r.modules)).map((r) => r.id),
  };
}

// Reconcile: make each of the user's targets contain the slug iff it is in the
// desired set. Only touches targets the user actually controls.
export async function reconcileAssignment(user: { id: string; email?: string | null }, slug: string, wantClassIds: string[], wantUnitIds: string[]): Promise<void> {
  const admin = createAdminClient();
  const targets = await assignableTargets(user);
  const wantC = new Set(wantClassIds), wantU = new Set(wantUnitIds);

  async function apply(table: "classes" | "class_units", allowed: AssignTarget[], want: Set<string>) {
    if (!allowed.length) return;
    const { data: rows } = await admin.from(table).select("id, modules").in("id", allowed.map((t) => t.id));
    for (const r of ((rows || []) as any[])) {
      const mods = (Array.isArray(r.modules) ? r.modules.map(String) : []) as string[];
      const present = mods.includes(slug);
      const shouldHave = want.has(r.id);
      if (shouldHave && !present) { await admin.from(table).update({ modules: [...mods, slug] }).eq("id", r.id); }
      else if (!shouldHave && present) { await admin.from(table).update({ modules: mods.filter((m) => m !== slug) }).eq("id", r.id); }
    }
  }
  await apply("classes", targets.classes, wantC);
  await apply("class_units", targets.units, wantU);
}
