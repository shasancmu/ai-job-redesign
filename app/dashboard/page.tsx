import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { activeEntitlements, FREE_TIER_MODULES, runsLeftByModule } from "@/lib/access";
import { PAYMENTS_ENABLED } from "@/lib/stripe";
import { isAdmin } from "@/lib/admin";
import { claimInvites, getMyOrgs, getActiveOrg, facilitatorAccess } from "@/lib/orgs";
import OrgSwitcher from "@/components/OrgSwitcher";
import AccountMenu from "@/components/AccountMenu";
import FacilitatorWelcome from "@/components/FacilitatorWelcome";
import { titleCaseName } from "@/lib/name";
import { MODULES } from "@/lib/modules";
import { levelFor, loadBundles, bundlesFor, nextCertificateStep } from "@/lib/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import Catalog from "@/components/Catalog";
import SessionsPanel from "@/components/SessionsPanel";
import LanguagePicker from "@/components/LanguagePicker";
import { I18N_ENABLED } from "@/lib/flags";
import EnrichOnce from "@/components/EnrichOnce";
import YourWork, { type WorkItem } from "@/components/YourWork";
import FollowUps from "@/components/FollowUps";
import { dueFollowUps } from "@/lib/followups";
import { computeStreak, artifactHref, nextStep } from "@/lib/momentum";
import { recommendedSlugs } from "@/lib/segments";
import { getServerLocale } from "@/lib/i18n-server";
import { makeT } from "@/lib/i18n";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import Tour from "@/components/Tour";

const DASHBOARD_TOUR = [
  { sel: '[data-tour="your-work"]', title: "Jump back in", body: "Your recent exercises and reports live here, so you can pick up right where you left off." },
  { sel: '[data-tour="catalog"]', title: "The library", body: "Every exercise is run by an AI interviewer, partner, or coach, and ends in something you keep. Tap the ⓘ on any card to see what it's about before you start." },
  { sel: '[data-tour="filters"]', title: "Find your starting point", body: "Filter by theme, like AI, Strategy, or Career, to narrow the library to what fits what you need right now." },
  { sel: '[data-tour="reports"]', title: "Your account", body: "This menu holds your reports, profile, and sign out. Everything you generate is saved under Reports, ready to reopen or share anytime." },
];

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

  // Turn any pending white-label invites for this email into memberships.
  await claimInvites(user.id, user.email);
  const [myOrgs, activeOrg, facAccess] = await Promise.all([getMyOrgs(user.id), getActiveOrg(user), facilitatorAccess(user)]);
  // A white-label org can curate which modules its members see + can run.
  const orgModules: string[] | null = activeOrg?.modules && activeOrg.modules.length ? activeOrg.modules : null;

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
  // A white-label org grants its curated modules to members, unlimited.
  if (orgModules) for (const s of orgModules) unlocked[s] = true;

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

  // Level: how many exercises finished → status ladder (links to /achievements).
  const credCount = MODULES.filter((m) => m.partner !== "group" && completed[m.slug]).length;
  const level = levelFor(credCount);

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
  const followUps = await dueFollowUps(supabase, user.id).catch(() => []);

  // Guided path: the next module toward the certificate you're closest to.
  let nextStep: ReturnType<typeof nextCertificateStep> = null;
  try {
    const admin = createAdminClient();
    const orgIds = myOrgs.map((m) => m.org.id);
    const completedList = MODULES.filter((m) => m.partner !== "group" && completed[m.slug]).map((m) => ({ slug: m.slug, at: "" }));
    const defs = await loadBundles(admin, { orgIds });
    nextStep = nextCertificateStep(bundlesFor(completedList, defs));
  } catch {
    /* bundles unavailable — skip the nudge */
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-x-3 gap-y-4">
        <div>
          <Logo />
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl">{t("dash.greeting", { name: profile?.display_name || "there" })}</h1>
            {streak.current > 0 && (
              <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium text-slate2">🔥 {streak.current}-week streak</span>
            )}
            {level.title && (
              <a
                href="/achievements"
                title="View your achievements"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-medium text-slate2 transition hover:border-slate-300"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3F7A52" }} />
                {level.title}
                <span className="text-slate-400">· {credCount}</span>
              </a>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 ml-auto">
          {myOrgs.length > 0 && (
            <OrgSwitcher
              orgs={myOrgs.map((m) => ({ slug: m.org.slug, name: m.org.name, logoUrl: m.org.logo_url, role: m.role }))}
              activeSlug={activeOrg?.slug || null}
            />
          )}
          {I18N_ENABLED && <LanguagePicker me={user.id} initial={(profile as any)?.language} />}
          <AccountMenu
            name={profile?.display_name || "You"}
            facilitator={facAccess.ok}
            director={facAccess.orgIds.length > 0}
            superadmin={facAccess.superadmin}
            dataTour="reports"
            labels={{
              reports: "Reports",
              achievements: "Achievements",
              profile: t("nav.profile"),
              facilitator: "My Cohorts",
              orgs: "Manage Organizations",
              signOut: t("nav.signOut"),
              tour: "Take a tour",
            }}
          />
        </div>
      </header>

      <FacilitatorWelcome orgs={myOrgs.filter((m) => m.role !== "member").map((m) => ({ slug: m.org.slug, name: m.org.name, role: m.role }))} />

      <EnrichOnce />

      <FollowUps items={followUps} />

      {nextStep && (
        <a href={`/start/${nextStep.nextSlug}`} className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 transition hover:shadow-sm">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">Next toward the {nextStep.name} certificate</div>
            <div className="mt-0.5 text-sm font-bold text-ink">{nextStep.nextName}</div>
            <div className="text-xs text-slate-400">{nextStep.remaining} module{nextStep.remaining === 1 ? "" : "s"} to go</div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-sage">Start &rarr;</span>
        </a>
      )}

      <div data-tour="your-work">
        <YourWork recents={recents} reportsCount={reportsCount} />
      </div>

      <section data-tour="catalog">
        <h2 className="eyebrow">{t("dash.exercises")}</h2>
        <p className="mb-5 mt-1 max-w-2xl text-sm text-slate2">{t("dash.framing")}</p>
        <Catalog
          userId={user.id}
          unlocked={unlocked}
          initialCohort={searchParams.cohort || ""}
          moduleSlugs={orgModules || undefined}
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
      <Tour steps={DASHBOARD_TOUR} storageKey="tour-dash-1" welcomeTitle="Welcome to Superadditive" welcomeBody="AI-run exercises for your strategy, your career, and your business. Here's a 30-second tour so you know where everything is. You can replay it anytime from “Take a tour.”" />
    </main>
  );
}
