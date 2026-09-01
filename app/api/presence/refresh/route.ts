import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/orgs";
import { MODULES } from "@/lib/modules";
import { fetchQuote } from "@/lib/quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Build (or refresh) the institution's remembering "presence" for the current
// learner + their active org, and cache it. Called fire-and-forget from the
// dashboard, so it never blocks the page. Grounded only in the learner's own
// activity; the org supplies the name + voice.
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });

  const org = await getActiveOrg(user);
  if (!org) return Response.json({ ok: false, reason: "no-org" });

  // The learner's own history (all their finished modules, newest first).
  const { data: sessions } = await supabase
    .from("sessions")
    .select("exercise, status, created_at")
    .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = sessions || [];

  const nameOf = (ex: string) => MODULES.find((m) => m.exercise === ex)?.name || null;
  const doneNames: string[] = [];
  const seen = new Set<string>();
  for (const s of rows) {
    if (s.status !== "done") continue;
    const n = nameOf(s.exercise);
    if (n && !seen.has(n)) { seen.add(n); doneNames.push(n); }
  }
  const count = doneNames.length;
  if (count < 1) return Response.json({ ok: false, reason: "too-new" }); // nothing to remember yet

  // Staleness: skip the rebuild if the count hasn't moved since last time.
  const admin = createAdminClient();
  const { data: cached } = await admin.from("learner_memory").select("n_sessions, updated_at").eq("user_id", user.id).eq("org_id", org.id).maybeSingle();
  const stale = !cached || cached.n_sessions !== count || (Date.now() - new Date(cached.updated_at).getTime()) > 7 * 864e5;
  if (!stale) return Response.json({ ok: true, fresh: true });

  const presenceName = org.presence_name || org.name;

  // The panel is just a nice quote now — live from the API, curated fallback. No AI.
  const reach = await fetchQuote();

  await admin.from("learner_memory").upsert({
    user_id: user.id, org_id: org.id, reach, n_sessions: count, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,org_id" });

  return Response.json({ ok: true, reach, presenceName });
}

// The learner clears what the presence remembers (their active org). RLS allows a
// learner to delete their own row, so this runs under their own session.
export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  const org = await getActiveOrg(user);
  if (org) await supabase.from("learner_memory").delete().eq("user_id", user.id).eq("org_id", org.id);
  return Response.json({ ok: true });
}
