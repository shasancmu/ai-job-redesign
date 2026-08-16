import type { SupabaseClient } from "@supabase/supabase-js";

// Normalize a class code for use in the URL and as the cohort key.
export function normalizeCode(raw: string): string {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

// A class member gets free access to that class's modules (the instructor is
// running the class — participants don't pay).
export async function hasClassAccess(
  supabase: SupabaseClient,
  userId: string,
  cohort: string | null | undefined,
  moduleSlug: string
): Promise<boolean> {
  if (!cohort) return false;
  const { data: klass } = await supabase
    .from("classes")
    .select("id, modules")
    .eq("code", cohort)
    .maybeSingle();
  if (!klass) return false;
  const modules: string[] = (klass.modules as any) || [];
  if (!modules.includes(moduleSlug)) return false;
  const { data: member } = await supabase
    .from("class_members")
    .select("user_id")
    .eq("class_id", klass.id)
    .eq("user_id", userId)
    .maybeSingle();
  return !!member;
}
