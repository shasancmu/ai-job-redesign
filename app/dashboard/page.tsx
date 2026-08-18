import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { activeEntitlements, FREE_TIER_MODULES, runsLeftByModule } from "@/lib/access";
import { PAYMENTS_ENABLED } from "@/lib/stripe";
import { isAdmin } from "@/lib/admin";
import { titleCaseName } from "@/lib/name";
import { MODULES } from "@/lib/modules";
import Catalog from "@/components/Catalog";
import SessionsPanel from "@/components/SessionsPanel";
import LanguagePicker from "@/components/LanguagePicker";
import { I18N_ENABLED } from "@/lib/flags";
import EnrichOnce from "@/components/EnrichOnce";
import YourWork, { type WorkItem } from "@/components/YourWork";
import { computeStreak, artifactHref, nextStep } from "@/lib/momentum";
import { recommendedSlugs } from "@/lib/segments";
import { getServerLocale } from "@/lib/i18n-server";
import { makeT } from "@/lib/i18n";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { cohort?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    const display = titleCaseName(
      (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "You"
    );
    await supabase.from("profiles").insert({ id: user.id, display_name: display });
    profile = { id: user.id, display_name: display } as any;
  } else if (profile.display_name) {
    // Backfill legacy names to proper case (fixes names saved before this rule).
    const clean = titleCaseName(profile.display_name);
    if (clean !== profile.display_name) {
      await supabase.from("profiles").update({ display_name: clean }).eq("id", user.id);
      profile.display_name = clean;
    }
  }

  // First-run: send people through onboarding before the dashboard. Guarded so
  // that if the onboarding columns haven't been migrated yet, we DON'T redirect
  // (a missing column would otherwise loop dashboard ⇄ welcome forever).
  {
    const { data: ob, error: obErr } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!obErr && ob && !ob.onboarded_at) redirect("/welcome");
  }

  const instructor = isAdmin(user.email);
  const ents = await activeEntitlements(supabase, user.id);
  const unlocked: Record<string, boolean> = {};
  for (const m of MODULES) {
    // "Unlocked" = startable from the catalog. Free-tier modules qualify (they
    // carry their own per-run cap, enforced at room entry); paid modules need an
    // entitlement. Cohort-scoped access is applied on the class view separately.
    unlocked[m.slug] =
      m.forSale === false ||
      !PAYMENTS_ENABLED ||
      instructor ||
      ents.has("all") ||
      ents.has(m.slug) ||
      FREE_TIER_MODULES.has(m.slug);
  }

  // Wide enough that a module's finished run never falls outside the window —
  // otherwise "Done" would flicker back to "In progress" as newer sessions
  // push the completed one past the limit.
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(300);

  // Which modules has this person completed, and where's their last run?
  const [{ data: bench }, { data: net }] = await Promise.all([
    supabase.from("benchmark_results").select("session_id").eq("user_id", user.id).limit(1),
    supabase.from("network_responses").select("cohort").eq("user_id", user.id).limit(1),
  ]);
  const benchmarkDone = (bench?.length || 0) > 0;
  const networkDone = (net?.length || 0) > 0;
  const completed: Record<string, boolean> = {};
  const lastCode: Record<string, string> = {};
  for (const m of MODULES) {
    const runs = (sessions || []).filter((s: any) => s.exercise === m.exercise);
    if (runs[0]) lastCode[m.slug] = runs[0].code;
    completed[m.slug] =
      m.exercise === "benchmark"
        ? benchmarkDone
        : m.exercise === "network"
          ? networkDone
          : runs.some((s: any) => s.status === "done");
  }

  const t = makeT(await getServerLocale());

  // "Recommended for you" — from their onboarding segment + goal.
  const validSlugs = new Set(MODULES.map((m) => m.slug));
  const recommended = recommendedSlugs(
    { segment: (profile as any)?.segment, goal: (profile as any)?.goal },
    validSlugs
  );

  // ---- "Your work" hub + momentum -----------------------------------------
  const streak = computeStreak((sessions || []).map((s: any) => s.created_at));
  // Iterate MODULES (registry order) rather than the session list, so each
  // card holds a FIXED position and never reshuffles when you open or re-run a
  // module. One card per module; "Done" if any of its runs finished.
  const workItems: WorkItem[] = [];
  for (const m of MODULES) {
    if (m.partner === "group") continue; // group runs (benchmark/network) have no revisitable artifact
    const mine = (sessions || []).filter((x: any) => x.exercise === m.exercise); // newest-first
    if (mine.length === 0) continue;
    const doneRun = mine.find((x: any) => x.status === "done"); // most recent finished run
    const done = !!doneRun;
    const ref = done ? doneRun : mine[0];
    workItems.push({
      slug: m.slug,
      name: m.name,
      done,
      href: done ? artifactHref(m.exercise, doneRun.code) : `/room/${mine[0].code}`,
      at: ref.created_at,
    });
  }
  const reportsCount = workItems.filter((w) => w.done).length;
  // The last few modules touched, newest first — a lightweight "jump back in".
  const recents = [...workItems].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 4);

  const runsLeft = await runsLeftByModule(supabase, user.id, instructor);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div>
          <Logo />
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl">{t("dash.greeting", { name: profile?.display_name || "there" })}</h1>
            {streak.current > 0 && (
              <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium text-slate2">🔥 {streak.current}-week streak</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {I18N_ENABLED && <LanguagePicker me={user.id} initial={(profile as any)?.language} />}
          <a href="/reports" className="btn-ghost text-sm">
            Reports
          </a>
          <a href="/profile" className="btn-ghost text-sm">
            {t("nav.profile")}
          </a>
          {instructor && (
            <a href="/facilitator" className="btn-ghost text-sm">
              {t("nav.facilitator")}
            </a>
          )}
          <form action="/auth/signout" method="post">
            <button className="btn-ghost text-sm">{t("nav.signOut")}</button>
          </form>
        </div>
      </header>
      <EnrichOnce />

      <YourWork recents={recents} reportsCount={reportsCount} />

      <section>
        <h2 className="eyebrow">{t("dash.exercises")}</h2>
        <p className="mb-5 mt-1 max-w-2xl text-sm text-slate2">{t("dash.framing")}</p>
        <Catalog
          userId={user.id}
          unlocked={unlocked}
          initialCohort={searchParams.cohort || ""}
          completed={completed}
          lastCode={lastCode}
          recommended={recommended}
          runsLeft={runsLeft}
        />
      </section>

      <section className="mt-10">
        <h2 className="eyebrow mb-3">{t("dash.yourSessions")}</h2>
        <SessionsPanel sessions={sessions || []} me={user.id} />
      </section>

      <Footer />
    </main>
  );
}
