import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/orgs";
import { MODULES } from "@/lib/modules";
import { AI_ENABLED, presenceGreetingAI } from "@/lib/ai";
import { fetchTrending } from "@/lib/trending";
import { setFlow } from "@/lib/aiflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Build (or refresh) the institution's remembering "presence" for the current
// learner + their active org, and cache it. Called fire-and-forget from the
// dashboard, so it never blocks the page. Grounded only in the learner's own
// activity; the org supplies the name + voice.
export async function POST() {
  setFlow("presence");
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

  const { data: profile } = await supabase.from("profiles").select("display_name, goal").eq("id", user.id).maybeSingle();
  const learnerName = (profile as any)?.display_name || (user.email || "there").split("@")[0];
  const firstSeen = rows.length ? new Date(rows[rows.length - 1].created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : undefined;
  const lastAt = rows[0]?.created_at ? new Date(rows[0].created_at).getTime() : Date.now();
  const returningAfterDays = Math.round((Date.now() - lastAt) / 864e5) || undefined;

  const presenceName = org.presence_name || org.name;
  let out: any = null;
  if (AI_ENABLED) {
    try {
      out = await presenceGreetingAI({
        presenceName, voice: org.presence_voice || undefined, orgName: org.name, learnerName,
        lastModule: doneNames[0], modulesDone: doneNames, goal: (profile as any)?.goal || undefined,
        firstSeen, count, returningAfterDays: returningAfterDays && returningAfterDays > 10 ? returningAfterDays : undefined,
      });
    } catch { out = null; }
  }
  const greeting = String(out?.greeting || `You were last working on ${doneNames[0]}.`).slice(0, 500);
  const remembers = Array.isArray(out?.remembers) ? out.remembers.map((r: any) => String(r).slice(0, 160)).slice(0, 6) : [];
  const hook = out?.hook ? String(out.hook).slice(0, 300) : null;

  // The outward "reach": one current/trending item tied to what they were last on.
  const query = out?.query ? String(out.query).slice(0, 120) : doneNames[0];
  const reach = await fetchTrending(query).catch(() => null);

  await admin.from("learner_memory").upsert({
    user_id: user.id, org_id: org.id, greeting, remembers, hook, reach, n_sessions: count, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,org_id" });

  return Response.json({ ok: true, greeting, remembers, reach, presenceName });
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
