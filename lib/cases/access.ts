import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCode } from "@/lib/classes";
import type { CaseGenome } from "./types";

export type CaseGate = { allowed: boolean; joinCode?: string; className?: string; reason?: "signin" | "enroll" };

// Decide whether `userId` may open a living case. Public cases are open. An
// "enrolled" case is open only to its author and to members (class_members) of a
// class it is assigned to; everyone else is asked to sign in / enroll.
export async function caseEnrollmentGate(slug: string, genome: CaseGenome, userId: string | null): Promise<CaseGate> {
  if ((genome.access || "public") !== "enrolled") return { allowed: true };
  const codes = [...new Set((genome.cohorts || []).map((c) => normalizeCode(c)).filter(Boolean))];
  if (!codes.length) return { allowed: true }; // enrolled but assigned to nothing yet -> open

  let admin;
  try { admin = createAdminClient(); } catch { return { allowed: true }; } // never lock out on infra failure

  // Author always has access.
  const { data: row } = await admin.from("custom_modules").select("author_id").eq("slug", slug).maybeSingle();
  if (userId && (row as any)?.author_id === userId) return { allowed: true };

  const { data: classes } = await admin.from("classes").select("id, code, name").in("code", codes);
  const list = (classes || []) as { id: string; code: string; name: string }[];
  const joinCode = list[0]?.code || codes[0];
  const className = list[0]?.name;

  if (!userId) return { allowed: false, joinCode, className, reason: "signin" };
  if (list.length) {
    const { data: mem } = await admin.from("class_members").select("class_id").eq("user_id", userId).in("class_id", list.map((c) => c.id)).limit(1);
    if (mem && mem.length) return { allowed: true };
  }
  return { allowed: false, joinCode, className, reason: "enroll" };
}

// The classes this user owns (instructor), for assigning a case to a class.
export async function listOwnedClasses(userId: string): Promise<{ code: string; name: string }[]> {
  let admin;
  try { admin = createAdminClient(); } catch { return []; }
  const { data } = await admin.from("classes").select("code, name, is_default").eq("owner_id", userId).order("created_at", { ascending: false });
  return ((data || []) as any[]).filter((c) => !c.is_default).map((c) => ({ code: c.code, name: c.name }));
}
