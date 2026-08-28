// The CLASS tier: school/company > CLASS (dept or course) > COHORT (section).
// A class owns a reusable module set that its cohorts inherit. Service-role
// helpers; writes go through /api/class-units (director/superadmin only).
import { createAdminClient } from "@/lib/supabase/admin";

export type ClassUnit = {
  id: string;
  org_id: string;
  name: string;
  modules: string[];
  is_default: boolean;
};

function admin() {
  try { return createAdminClient(); } catch { return null; }
}

// Every class in an org, newest-ish first, defaults last so "General" sorts to
// the end. Returns [] if the table isn't set up yet.
export async function listClassUnits(orgId: string): Promise<ClassUnit[]> {
  const db = admin();
  if (!db || !orgId) return [];
  try {
    const { data } = await db.from("class_units").select("id, org_id, name, modules, is_default").eq("org_id", orgId);
    const rows = ((data as any[]) || []).map((r) => ({ id: r.id, org_id: r.org_id, name: r.name, modules: Array.isArray(r.modules) ? r.modules : [], is_default: !!r.is_default }));
    rows.sort((a, b) => (a.is_default === b.is_default ? a.name.localeCompare(b.name) : a.is_default ? 1 : -1));
    return rows;
  } catch { return []; }
}

export async function getClassUnit(id: string): Promise<ClassUnit | null> {
  const db = admin();
  if (!db || !id) return null;
  try {
    const { data } = await db.from("class_units").select("id, org_id, name, modules, is_default").eq("id", id).maybeSingle();
    if (!data) return null;
    const r = data as any;
    return { id: r.id, org_id: r.org_id, name: r.name, modules: Array.isArray(r.modules) ? r.modules : [], is_default: !!r.is_default };
  } catch { return null; }
}

// How many cohorts sit under each class, keyed by class_unit_id.
export async function cohortCountsByClass(orgId: string): Promise<Record<string, number>> {
  const db = admin();
  if (!db || !orgId) return {};
  try {
    const { data } = await db.from("classes").select("class_unit_id").eq("org_id", orgId);
    const out: Record<string, number> = {};
    for (const r of ((data as any[]) || [])) { const id = r.class_unit_id; if (id) out[id] = (out[id] || 0) + 1; }
    return out;
  } catch { return {}; }
}
