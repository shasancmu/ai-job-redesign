// The middle tier of authority in one place. A program director runs a CLASS/
// program (class_unit) — its cohorts, its instructors, its alumni — as a P&L,
// without directing the whole org. Assignment lives in the program_directors
// table; writes go through /api/class-units/directors (org-director gated).
import { createAdminClient } from "@/lib/supabase/admin";

export type ProgramDirector = {
  user_id: string;
  name: string;
  email: string | null;
  created_at: string;
};

function admin() {
  try { return createAdminClient(); } catch { return null; }
}

// Everyone who directs a given program, with a display name + email for the UI.
// Emails come from auth (profiles doesn't store them); one lookup per director,
// which is fine — a program has a handful of directors, not thousands.
export async function listProgramDirectors(classUnitId: string): Promise<ProgramDirector[]> {
  const db = admin();
  if (!db || !classUnitId) return [];
  try {
    const { data } = await db.from("program_directors").select("user_id, created_at").eq("class_unit_id", classUnitId);
    const rows = ((data as any[]) || []).filter(Boolean);
    if (!rows.length) return [];
    const ids = rows.map((r) => r.user_id);
    const { data: profs } = await db.from("profiles").select("id, display_name").in("id", ids);
    const nameById = new Map<string, string>(((profs as any[]) || []).map((p) => [p.id, p.display_name || "Member"]));
    const emailById = new Map<string, string>();
    for (const id of ids) {
      try { const { data: u } = await db.auth.admin.getUserById(id); if (u?.user?.email) emailById.set(id, u.user.email); } catch { /* ignore */ }
    }
    return rows
      .map((r) => ({ user_id: r.user_id, name: nameById.get(r.user_id) || "Member", email: emailById.get(r.user_id) || null, created_at: r.created_at }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch { return []; }
}

// The programs a user directs, as ids (used to scope roll-ups to their subtree).
export async function programsDirectedBy(userId: string): Promise<string[]> {
  const db = admin();
  if (!db || !userId) return [];
  try {
    const { data } = await db.from("program_directors").select("class_unit_id").eq("user_id", userId);
    return ((data as any[]) || []).map((r) => r.class_unit_id).filter(Boolean);
  } catch { return []; }
}

// Resolve an email to a user id, but only if they already belong to the given org
// — you appoint from inside the school, you don't conjure a stranger into power.
// Returns { userId } on success, or { error } with a message for the UI.
export async function resolveOrgMemberByEmail(orgId: string, email: string): Promise<{ userId?: string; error?: string }> {
  const db = admin();
  if (!db) return { error: "service role not set" };
  const wanted = String(email || "").trim().toLowerCase();
  if (!wanted.includes("@")) return { error: "Enter a valid email." };
  let userId = "";
  for (let page = 1; page <= 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const list = data?.users || [];
    const hit = list.find((u) => (u.email || "").toLowerCase() === wanted);
    if (hit) { userId = hit.id; break; }
    if (list.length < 1000) break;
  }
  if (!userId) return { error: "No account with that email yet. Invite them to the school first." };
  const { data: mem } = await db.from("org_members").select("user_id").eq("org_id", orgId).eq("user_id", userId).maybeSingle();
  if (!mem) return { error: "They're not a member of this school yet. Add them under People first, then appoint." };
  return { userId };
}

export async function assignProgramDirector(opts: { classUnitId: string; orgId: string; userId: string; assignedBy: string }): Promise<{ ok: boolean; error?: string }> {
  const db = admin();
  if (!db) return { ok: false, error: "service role not set" };
  const { error } = await db.from("program_directors").upsert(
    { class_unit_id: opts.classUnitId, org_id: opts.orgId, user_id: opts.userId, assigned_by: opts.assignedBy },
    { onConflict: "class_unit_id,user_id" }
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeProgramDirector(classUnitId: string, userId: string): Promise<{ ok: boolean; error?: string }> {
  const db = admin();
  if (!db) return { ok: false, error: "service role not set" };
  const { error } = await db.from("program_directors").delete().eq("class_unit_id", classUnitId).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
