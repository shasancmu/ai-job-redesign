import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { moduleByExercise } from "@/lib/modules";

// Reports are the pages people accumulate tabs of, and a five-character code
// tells two of them apart in no useful way. These resolve which exercise
// produced a session so the tab can carry the module's own name.
//
// Deliberately narrow: one indexed single-column read, memoised per request,
// and it never throws. A report page still does its own loading and its own
// access checks — this only decides what the tab says.
const exerciseFor = cache(async (rawCode: string): Promise<string | null> => {
  try {
    const code = String(rawCode || "").toUpperCase();
    if (!code) return null;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    // Mirrors loadOwnerReport: an admin viewing someone else's report reads
    // through the service role, so their tab gets a real name too.
    const db = isAdmin(user.email) ? createAdminClient() : supabase;
    const { data } = await db.from("sessions").select("exercise").eq("code", code).maybeSingle();
    return ((data as any)?.exercise as string) || null;
  } catch {
    return null;
  }
});

// The module's name when the session is readable, the route's own label when
// it isn't — an unreadable or missing session must never break the page.
export async function reportTitle(rawCode: string, fallback: string): Promise<{ title: string }> {
  const exercise = await exerciseFor(rawCode);
  const mod = exercise ? moduleByExercise(exercise) : null;
  return { title: mod?.name || fallback };
}
