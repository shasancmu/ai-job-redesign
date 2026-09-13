// The one place a module run page boots.
//
// Every authored run route (/m /n /x /e /b /nf …) repeated the same sequence:
// create the supabase client, get the user, redirect to login when signed out,
// record a "start" event, and localize the client-safe spec for the viewer.
// Doing that per-route meant every cross-cutting concern (localization, cohort
// parsing, and next: analytics/access-gating) had to be wired into ~10 files by
// hand. This hook centralizes it, driven by `lib/moduleKinds.ts`, so a run route
// is now: prepareModuleRun → load spec → render Runner with `localize(...)`.
//
// Server-only (imports next/navigation + the admin-backed helpers).
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordModuleEvent } from "@/lib/moduleEvents";
import { localizeForViewer } from "@/lib/translationCache";
import { moduleKindById } from "@/lib/moduleKinds";

export type ModuleRunContext = {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  /** Cohort/class code from the URL (?class= or ?cohort= or ?c=), or null. */
  cohort: string | null;
  /** Localize a client-safe payload to the viewer's language (cache-backed no-op for English). */
  localize: <T>(data: T) => Promise<T>;
};

export async function prepareModuleRun(opts: {
  /** Registry id for the kind, e.g. "roleplay" — resolves the run base + event label. */
  kindId: string;
  slug: string;
  searchParams?: { class?: string; cohort?: string; c?: string };
  /** Record a "start" module event. Default true; a route may opt out to preserve prior behavior. */
  recordStart?: boolean;
}): Promise<ModuleRunContext> {
  const { kindId, slug, searchParams = {}, recordStart = true } = opts;
  const runBase = moduleKindById(kindId)?.runBase || `/${kindId}/`;
  const cohort = (searchParams.class || searchParams.cohort || searchParams.c || "").trim() || null;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const q = cohort ? `?class=${cohort}` : "";
    redirect(`/login?next=${encodeURIComponent(`${runBase}${slug}${q}`)}`);
  }
  if (recordStart) await recordModuleEvent(slug, kindId, "start", user.id);

  return {
    supabase,
    userId: user.id,
    cohort,
    localize: (data) => localizeForViewer(data, supabase, user.id),
  };
}
