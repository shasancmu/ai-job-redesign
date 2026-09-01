import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { runWallet, runsLeftByModule, grantedModuleSlugs, alumniOffer } from "@/lib/access";
import { roleplayCatalogMap } from "@/lib/mechanics/store";
import { interviewMetaBySlugs } from "@/lib/customModules";
import { PAYMENTS_ENABLED } from "@/lib/stripe";
import { isAdmin } from "@/lib/admin";
import { claimInvites, getMyOrgs, getActiveOrg, facilitatorAccess, masterCohortCode } from "@/lib/orgs";
import { SCITOOLS, RESEARCH_TOOLS } from "@/lib/researchTools";
import OrgSwitcher from "@/components/OrgSwitcher";
import AccountMenu from "@/components/AccountMenu";
import FacilitatorWelcome from "@/components/FacilitatorWelcome";
import { titleCaseName } from "@/lib/name";
import { MODULES, moduleBySlug } from "@/lib/modules";
import { levelFor, loadBundles, bundlesFor, bundlesForSlug, nextCertificateStep } from "@/lib/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { viewAsTarget } from "@/lib/viewAs";
import { inboxFor, type InboxItem } from "@/lib/pushes";
import ViewAsBanner from "@/components/ViewAsBanner";
import { listAuthoredModules } from "@/lib/moduleCatalog";
import Catalog from "@/components/Catalog";
import SessionsPanel from "@/components/SessionsPanel";
import LanguagePicker from "@/components/LanguagePicker";
import { I18N_ENABLED } from "@/lib/flags";
import EnrichOnce from "@/components/EnrichOnce";
import YourWork, { type WorkItem } from "@/components/YourWork";
import PresenceGreeting from "@/components/PresenceGreeting";
import PortraitInvite from "@/components/PortraitInvite";
import EasterEgg from "@/components/EasterEgg";
import Dismissible from "@/components/Dismissible";
import { cookies } from "next/headers";
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
  searchParams: { cohort?: string; done?: string };
}) {
  const rls = createClient();
  const { data: { user: realUser } } = await rls.auth.getUser();
  if (!realUser) redirect("/login");

  // Superadmin "view as": render this page as another user — a READ lens. Reads
  // switch to the service-role client + the target's id; the target's session is
  // never minted, so nothing can act as them. The proxy uses the Personal
  // context, which is where the consumer runs view lives.
  const proxy = await viewAsTarget(realUser);
  const isProxy = !!proxy;
  const user: any = isProxy ? { id: proxy!.id, email: proxy!.email, user_metadata: {} } : realUser;
  const supabase: any = isProxy ? createAdminClient() : rls;

  // Turn any pending white-label invites for this email into memberships.
  if (!isProxy) await claimInvites(user.id, user.email);
  const [myOrgs, facAccess] = await Promise.all([getMyOrgs(user.id), facilitatorAccess(user)]);
  const activeOrg = isProxy ? null : await getActiveOrg(realUser);
  // A white-label org can curate which modules its members see + can run.
  const orgModules: string[] | null = activeOrg?.modules && activeOrg.modules.length ? activeOrg.modules : null;

  // The cohort this person is in for the active org, shown at the top so they
  // always know where they are. A specific class they joined wins over the org's
  // default "All members" cohort.
  let cohortName = "";
  if (activeOrg) {
    try {
      const a = createAdminClient();
      const { data: cms } = await a.from("class_members").select("class_id").eq("user_id", user.id);
      const ids = ((cms as any[]) || []).map((c) => c.class_id).filter(Boolean);
      if (ids.length) {
        const { data: cls } = await a.from("classes").select("name, is_default").in("id", ids).eq("org_id", activeOrg.id);
        const rows = (cls as any[]) || [];
        const chosen = rows.find((c) => !c.is_default) || rows[0];
        // The org's default cohort shows as "All members" (its stored name repeats
        // the org and carries an em dash); a specific class shows its own name.
        cohortName = chosen ? (chosen.is_default ? "All members" : chosen.name) : "";
      }
    } catch { /* no service role; fall back to a derived label */ }
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    const display = titleCaseName(
      (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "You"
    );
    if (!isProxy) await supabase.from("profiles").insert({ id: user.id, display_name: display });
    profile = { id: user.id, display_name: display } as any;
  } else if (profile.display_name) {
    // Backfill legacy names to proper case (fixes names saved before this rule).
    const clean = titleCaseName(profile.display_name);
    if (clean !== profile.display_name) {
      if (!isProxy) await supabase.from("profiles").update({ display_name: clean }).eq("id", user.id);
      profile.display_name = clean;
    }
  }

  // First-run: send people through onboarding before the dashboard. Guarded so
  // that if the onboarding columns haven't been migrated yet, we DON'T redirect
  // (a missing column would otherwise loop dashboard ⇄ welcome forever).
  // (Skipped while proxying: /welcome isn't proxied, so a not-yet-onboarded
  // target would loop dashboard ⇄ welcome. A superadmin viewing just renders.)
  if (!isProxy) {
    const { data: ob, error: obErr } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!obErr && ob && !ob.onboarded_at) redirect("/welcome");
  }

  const instructor = isAdmin(user.email);
  // Runs wallet: a paid exercise is startable while the shared wallet has runs.
  const wallet = await runWallet(supabase, user.id);
  const hasRuns = wallet.balance > 0;
  const unlocked: Record<string, boolean> = {};
  for (const m of MODULES) {
    // "Unlocked" = startable from the catalog: free/instructor-run exercises,
    // payments-off, admin, or the wallet still has runs to spend. Cohort/class
    // grants are layered on below.
    unlocked[m.slug] =
      m.forSale === false ||
      !PAYMENTS_ENABLED ||
      instructor ||
      hasRuns;
  }
  // A white-label org grants its curated modules to members, unlimited.
  if (orgModules) for (const s of orgModules) unlocked[s] = true;
  // Cohort/class access: modules granted through any class or org the user
  // belongs to are startable, so the catalog must show them unlocked too. This
  // matches moduleRunAccess, so a completed cohort module never flips to locked.
  try {
    const granted = await grantedModuleSlugs(supabase, user.id);
    for (const s of granted) unlocked[s] = true;
  } catch { /* no class grants */ }

  // Modules a class assigned to this learner that DON'T live in the static
  // catalog: role-play (run at /m/[slug]) and custom interview (run at
  // /start/[slug]). Surfaced as their own section with the class code threaded
  // through, so results tag to the cohort. Registry slugs are skipped here — the
  // catalog below already shows them.
  type ClassAssignment = { slug: string; name: string; emoji: string; href: string; className: string };
  const classAssignments: ClassAssignment[] = [];
  try {
    const a = createAdminClient();
    const { data: cms } = await a.from("class_members").select("class_id").eq("user_id", user.id);
    const ids = [...new Set(((cms as any[]) || []).map((c) => c.class_id).filter(Boolean))];
    if (ids.length) {
      const { data: cls } = await a.from("classes").select("code, name, modules").in("id", ids);
      const assignedSlugs = [...new Set(((cls as any[]) || []).flatMap((c) => (c.modules as any[]) || []).map(String))];
      const [rpMap, ivMap, authored] = await Promise.all([roleplayCatalogMap(), interviewMetaBySlugs(assignedSlugs), listAuthoredModules()]);
      const auMap: Record<string, { name: string; emoji: string; prefix: string }> = Object.fromEntries(authored.map((m) => [m.slug, { name: m.name, emoji: m.emoji, prefix: m.prefix }]));
      const seen = new Set<string>();
      for (const c of (cls as any[]) || []) {
        for (const s of (c.modules as any[]) || []) {
          const slug = String(s);
          if (seen.has(slug)) continue;
          if (rpMap[slug]) { seen.add(slug); classAssignments.push({ slug, name: rpMap[slug].name, emoji: rpMap[slug].emoji, href: `/m/${slug}?class=${encodeURIComponent(c.code)}`, className: c.name }); }
          else if (ivMap[slug]) { seen.add(slug); classAssignments.push({ slug, name: ivMap[slug].name, emoji: ivMap[slug].emoji, href: `/start/${slug}?cohort=${encodeURIComponent(c.code)}`, className: c.name }); }
          else if (auMap[slug]) { seen.add(slug); classAssignments.push({ slug, name: auMap[slug].name, emoji: auMap[slug].emoji, href: `/${auMap[slug].prefix}/${slug}?cohort=${encodeURIComponent(c.code)}`, className: c.name }); }
        }
      }
    }
  } catch { /* no service role or table */ }

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

  // The institution's remembering "presence" (Ritz "Mystique"): a cached warm
  // greeting + what it remembers. Reads the cache only (fast); the component
  // refreshes itself in the background when stale. Degrades to nothing if the
  // learner_memory table / presence columns aren't there yet.
  let presence: { name: string; reach: any; needsRefresh: boolean } | null = null;
  if (activeOrg && !isProxy) {
    try {
      const { data: mem } = await supabase.from("learner_memory").select("reach, n_sessions, updated_at").eq("user_id", user.id).eq("org_id", activeOrg.id).maybeSingle();
      const stale = !mem || (mem as any).n_sessions !== reportsCount || (Date.now() - new Date((mem as any).updated_at).getTime()) > 3 * 864e5;
      presence = {
        name: (activeOrg as any).presence_name || activeOrg.name,
        reach: (mem as any)?.reach || null,
        needsRefresh: reportsCount >= 1 && stale,
      };
    } catch { presence = null; }
  }

  // The last few modules touched, newest first — a lightweight "jump back in".
  const recents = [...workItems].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 4);

  const runsLeft = await runsLeftByModule(supabase, user.id, instructor);
  const followUps = await dueFollowUps(supabase, user.id).catch(() => []);

  // Guided path: the next module toward the certificate you're closest to, plus
  // a slug→certificate map that powers the "counts toward X" tags and the pull to
  // finish a certificate the moment someone touches one of its modules.
  let nextStep: ReturnType<typeof nextCertificateStep> = null;
  const certByModule: Record<string, string> = {};
  try {
    const admin = createAdminClient();
    const orgIds = myOrgs.map((m) => m.org.id);
    const completedList = MODULES.filter((m) => m.partner !== "group" && completed[m.slug]).map((m) => ({ slug: m.slug, at: "" }));
    const defs = await loadBundles(admin, { orgIds });
    nextStep = nextCertificateStep(bundlesFor(completedList, defs));
    for (const m of MODULES) {
      const b = bundlesForSlug(m.slug, defs)[0];
      if (b) certByModule[m.slug] = b.name;
    }
  } catch {
    /* bundles unavailable — skip the nudge */
  }

  // "Continue where you left off": the most recent unfinished run. The single
  // biggest lever on completion — resuming beats re-deciding what to do.
  const continueItem = [...workItems].filter((w) => !w.done).sort((a, b) => (a.at < b.at ? 1 : -1))[0] || null;
  const continueCert = continueItem ? certByModule[continueItem.slug] : undefined;

  // Pushes from the org — the Relationship OS "micro-doses of value" (a new
  // module, an offer, an event) landing in the learner's home.
  let inbox: InboxItem[] = [];
  try { inbox = await inboxFor(createAdminClient(), user.id, activeOrg?.name || "Your program"); } catch { /* none */ }

  // The student's most recent capstone team (as captain or member), for a quick
  // revisit to the shared board or their team's graded report.
  let myCapstone: { code: string; phase: number; status: string } | null = null;
  try {
    const a = createAdminClient();
    const { data: mem } = await a.from("capstone_members").select("session_id").eq("user_id", user.id);
    const ids = (mem || []).map((m: any) => m.session_id);
    const { data: hosted } = await a.from("capstone_sessions").select("id, code, phase, status, created_at").eq("host_id", user.id);
    const joined = ids.length ? (await a.from("capstone_sessions").select("id, code, phase, status, created_at").in("id", ids)).data || [] : [];
    const all = [...(hosted || []), ...joined].filter((v, i, arr) => arr.findIndex((x: any) => x.id === v.id) === i);
    all.sort((x: any, y: any) => String(y.created_at || "").localeCompare(String(x.created_at || "")));
    if (all[0]) myCapstone = { code: all[0].code, phase: all[0].phase, status: all[0].status };
  } catch { /* no capstone teams */ }

  // Cards the learner has dismissed (stored in a cookie the server can read, so a
  // dismissed card is simply never rendered again). Keyed so a new resume/capstone
  // can still surface later.
  let dismissed = new Set<string>();
  try { dismissed = new Set(decodeURIComponent(cookies().get("dash_dismissed")?.value || "").split(",").filter(Boolean)); } catch { /* none */ }
  const resumeId = `resume:${continueItem ? continueItem.slug : nextStep?.nextSlug || "next"}`;
  const capstoneId = myCapstone ? `capstone:${myCapstone.code}` : "";

  // Role-appropriate home. The org / class / cohort machinery is for staff;
  // a learner should see their program (assigned work + progress), not the
  // whole library. So an org member gets a cohort-first home and the general
  // library is hidden — unless the org opts members into free exploration.
  const activeMembership = activeOrg ? myOrgs.find((m) => m.org.id === activeOrg.id) : null;
  const isStaffHere = facAccess.superadmin || activeMembership?.role === "instructor" || activeMembership?.role === "director";
  const isOrgLearner = !!activeOrg && !isStaffHere;
  // Deep-tech org? Then surface the Scientifiq research-intelligence tools.
  const isDeepTech = (activeOrg?.modules || []).some((s) => SCITOOLS.has(s));
  const researchTools = RESEARCH_TOOLS.filter((t) => !t.staffOnly || isStaffHere);
  const showLibrary = !isOrgLearner || !!activeOrg?.member_can_browse;

  // The consumer (no org, not staff). A brand-new one gets a guided front door
  // — a "Start here" pick and the full library collapsed — instead of the whole
  // catalog at once. Their runs balance is surfaced so they know where they
  // stand, with a time-boxed alumni pack nudge when eligible.
  const isConsumer = !activeOrg && !facAccess.ok;
  const runsBalance = Math.max(0, wallet.balance);
  const completedCount = MODULES.filter((m) => m.partner !== "group" && completed[m.slug]).length;
  const isNewConsumer = isConsumer && completedCount === 0;
  const startHere = isConsumer
    ? recommended.map((s) => moduleBySlug(s)).filter((m): m is NonNullable<typeof m> => !!m && m.partner !== "group").slice(0, 3)
    : [];
  const showRuns = isConsumer && PAYMENTS_ENABLED;
  const offer = showRuns ? await alumniOffer(supabase, user.id) : { active: false, daysLeft: 0 };

  const catalogEl = (
    <Catalog
      userId={user.id}
      unlocked={unlocked}
      initialCohort={searchParams.cohort || (activeOrg ? masterCohortCode(activeOrg.id) : "")}
      moduleSlugs={orgModules || undefined}
      completed={completed}
      lastCode={lastCode}
      recommended={recommended}
      runsLeft={runsLeft}
      certByModule={certByModule}
    />
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <EasterEgg />
      {isProxy && <ViewAsBanner email={proxy!.email} />}

      {presence && (presence.reach || presence.needsRefresh) && (
        <PresenceGreeting presenceName={presence.name} initialReach={presence.reach} needsRefresh={presence.needsRefresh} />
      )}

      <PortraitInvite />

      {/* Celebration on return from a finished run (Fogg: emotion right after the
          behavior wires the habit). The Continue + certificate cards below are the
          "what's next", reached on the motivation wave. */}
      {searchParams.done && (
        <div className="mb-6 rounded-2xl border-2 border-sage/40 bg-gradient-to-br from-sage/8 to-white p-4 text-center">
          <div className="joy-pop text-2xl" aria-hidden>🎉</div>
          <div className="mt-0.5 text-sm font-bold text-ink">
            {(() => { const m = searchParams.done && searchParams.done !== "1" ? moduleBySlug(searchParams.done) : null; return m ? `Nice — you finished ${m.name}.` : "Nice work — that's done and saved."; })()}
          </div>
          <div className="mt-0.5 text-xs text-slate2">It&apos;s yours to keep. Keep the momentum going below.</div>
        </div>
      )}
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
            {showRuns && (
              <a
                href="/paywall"
                title="Your runs — one run is one exercise. Tap to top up."
                className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition hover:border-slate-300 " + (runsBalance === 0 ? "border-clay/40 bg-clay/5 text-clay" : "border-line bg-white text-slate2")}
              >
                🎟️ {runsBalance} run{runsBalance === 1 ? "" : "s"} left
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
              signOut: t("nav.signOut"),
              tour: "Take a tour",
            }}
          />
        </div>
      </header>

      {activeOrg && (
        <div className="mb-6 flex items-center gap-2.5 text-sm">
          {activeOrg.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeOrg.logo_url} alt="" className="h-6 w-6 shrink-0 rounded object-contain" />
          ) : (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-mist text-[10px] font-bold text-slate2">{activeOrg.name.slice(0, 2).toUpperCase()}</div>
          )}
          <span className="min-w-0 truncate text-slate2"><span className="font-semibold text-ink">{activeOrg.name}</span> · {cohortName || "All members"}</span>
          {isOrgLearner && <span className="shrink-0 rounded-full bg-sage/10 px-2 py-0.5 text-[11px] font-semibold text-sage">Included — free</span>}
        </div>
      )}

      <FacilitatorWelcome orgs={myOrgs.filter((m) => m.role !== "member").map((m) => ({ slug: m.org.slug, name: m.org.name, role: m.role }))} />

      <EnrichOnce />

      <FollowUps items={followUps} />

      {/* ONE primary "next" card — resume an unfinished run if there is one, else
          the next step toward the certificate. Certificate progress rides along as
          a bar so momentum shows without a second competing card. */}
      {(continueItem || nextStep) && !dismissed.has(resumeId) && (
        <Dismissible id={resumeId}>
        <a href={continueItem ? continueItem.href : `/start/${nextStep!.nextSlug}`} className="group mb-6 block rounded-2xl border-2 border-sage/40 bg-gradient-to-br from-white to-sage/5 p-5 transition hover:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">
                {continueItem ? "Pick up where you left off" : `${nextStep!.progressPct}% toward the ${nextStep!.name} certificate`}
              </div>
              <div className="mt-0.5 truncate text-base font-bold text-ink group-hover:text-sage">{continueItem ? continueItem.name : `Next: ${nextStep!.nextName}`}</div>
              <div className="truncate text-xs text-slate-400">
                {continueItem
                  ? (continueCert ? `Toward your ${continueCert} certificate — just ${nextStep ? nextStep.remaining : ""} more` : "You were partway through — finish it in a few minutes.")
                  : `Just ${nextStep!.remaining} more to earn it — keep the momentum.`}
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-sage">{continueItem ? "Resume" : "Continue"} &rarr;</span>
          </div>
          {nextStep && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${Math.max(6, nextStep.progressPct)}%` }} />
            </div>
          )}
        </a>
        </Dismissible>
      )}

      {/* Runs banner only when it's actually urgent — out of runs, or the alumni
          window is open. The header chip carries the balance the rest of the time. */}
      {showRuns && offer.active ? (
        <a href="/paywall" className="mb-8 flex items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-white p-4 transition hover:shadow-sm">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-clay">Cohort alumni · ends in {offer.daysLeft} day{offer.daysLeft === 1 ? "" : "s"}</div>
            <div className="mt-0.5 text-sm font-bold text-ink">{runsBalance} runs left — top up at your alumni price</div>
            <div className="text-xs text-slate-400">Your lowest per-run price. Runs never expire.</div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-ink">Get runs →</span>
        </a>
      ) : showRuns && runsBalance === 0 ? (
        <a href="/paywall" className="mb-6 flex items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-white p-4 transition hover:shadow-sm">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">Your runs</div>
            <div className="mt-0.5 text-sm font-bold text-ink">You&apos;re out of runs</div>
            <div className="text-xs text-slate-400">Add a pack to keep going — spend runs on any exercise.</div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-sage">Get runs →</span>
        </a>
      ) : null}

      {/* From your program — the org's pushes (new modules, offers, events). */}
      {inbox.length > 0 && (
        <section className="mb-8">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">From {inbox[0].from}</div>
          <div className="space-y-2">
            {inbox.map((p) => {
              const emoji = p.kind === "module" ? "✦" : p.kind === "offer" ? "🎓" : p.kind === "event" ? "📅" : "📣";
              const inner = (
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:shadow-sm">
                  <span className="text-xl" aria-hidden>{emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-ink">{p.title}</div>
                    {p.body && <div className="truncate text-xs text-slate-400">{p.body}</div>}
                  </div>
                  {p.href && <span className="shrink-0 text-sm font-semibold text-sage">{p.cta || "Open"} →</span>}
                </div>
              );
              return p.href
                ? <a key={p.id} href={p.href}>{inner}</a>
                : <div key={p.id}>{inner}</div>;
            })}
          </div>
        </section>
      )}

      {/* Staff authoring — demoted to a slim secondary link, not a hero card. */}
      {(facAccess.superadmin || facAccess.orgIds.length > 0) && (
        <a href="/studio/upload" className="group mb-4 flex items-center gap-2 text-sm text-slate2 transition hover:text-ai">
          <span aria-hidden>📎</span>
          <span className="font-medium text-ink group-hover:text-ai">Turn your materials into a module</span>
          <span className="text-slate-400">· or open the Studio</span>
          <span className="text-ai">→</span>
        </a>
      )}

      {facAccess.orgIds.length > 0 && (
        <a href="/org/settings" className="group mb-8 flex items-center gap-2 text-sm text-slate2 transition hover:text-ai">
          <span aria-hidden>⚙️</span>
          <span className="font-medium text-ink group-hover:text-ai">Organization settings</span>
          <span className="text-slate-400">· logo, hero image, and text</span>
          <span className="text-ai">→</span>
        </a>
      )}

      {(classAssignments.length > 0 || isOrgLearner) && (
        <section className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{isOrgLearner ? "Your program" : "Assigned by your class"}</div>
          {classAssignments.length === 0 ? (
            <div className="mt-2 rounded-2xl border border-dashed border-line bg-white p-6 text-center">
              <div className="text-sm font-semibold text-ink">Nothing assigned yet</div>
              <div className="mt-1 text-sm text-slate2">When your instructor assigns an exercise{cohortName ? ` to ${cohortName}` : ""}, it appears right here.</div>
            </div>
          ) : (
          <div className="mt-2 grid gap-3 sm:grid-cols-2 stagger-in">
            {classAssignments.map((r) => (
              <a key={r.slug} href={r.href} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:shadow-sm">
                <div className="text-2xl">{r.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink group-hover:text-ai">{r.name}</div>
                  <div className="text-xs text-slate-400">{r.className}</div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-sage">Start &rarr;</span>
              </a>
            ))}
          </div>
          )}
        </section>
      )}

      <div data-tour="your-work">
        <YourWork recents={recents} reportsCount={reportsCount} />
      </div>

      {myCapstone && !dismissed.has(capstoneId) && (
        <Dismissible id={capstoneId}>
        <a href={`/capstone/${myCapstone.code}`} className="mb-6 flex items-center justify-between rounded-2xl border border-line bg-white p-4 transition hover:shadow-lift">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>📉</span>
            <div>
              <div className="font-bold text-ink">Your team capstone: The Number</div>
              <div className="text-sm text-slate2">{myCapstone.status === "graded" || myCapstone.phase >= 3 ? "View your team's reckoning report" : "Rejoin your team"}</div>
            </div>
          </div>
          <span className="shrink-0 text-slate-300">→</span>
        </a>
        </Dismissible>
      )}

      {isDeepTech && researchTools.length > 0 && (
        <section className="mb-8">
          <h2 className="eyebrow">Research intelligence</h2>
          <p className="mb-4 mt-1 max-w-2xl text-sm text-slate2">Scientifiq.AI tools — ask the ecosystem, score a portfolio across every dimension of potential, and map cross-disciplinary collaboration.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger-in">
            {researchTools.map((t) => (
              <a key={t.href} href={t.href} className="group flex flex-col rounded-2xl border border-line bg-white p-4 transition hover:shadow-sm">
                <div className="text-2xl">{t.emoji}</div>
                <div className="mt-2 text-sm font-bold text-ink group-hover:text-ai">{t.name}</div>
                <div className="mt-0.5 line-clamp-3 flex-1 text-xs text-slate-400">{t.desc}</div>
                {t.note && <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">{t.note}</div>}
              </a>
            ))}
          </div>
        </section>
      )}

      {showLibrary && (isNewConsumer && startHere.length > 0 ? (
        // A first-time consumer: one clear place to start, with the full library
        // tucked behind a disclosure so the first screen isn't 80 choices.
        <section data-tour="catalog">
          <h2 className="eyebrow">Start here</h2>
          <p className="mb-5 mt-1 max-w-2xl text-sm text-slate2">New to Superadditive? Pick one and do it — about 20 minutes, and you walk away with something real, not a completion checkmark.</p>
          <div className="grid gap-3 sm:grid-cols-3 stagger-in">
            {startHere.map((m) => (
              <a key={m.slug} href={`/start/${m.slug}`} className="group flex flex-col rounded-2xl border border-line bg-white p-4 transition hover:shadow-sm">
                <div className="text-2xl">{m.emoji}</div>
                <div className="mt-2 text-sm font-bold text-ink group-hover:text-ai">{m.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-slate-400">{m.tagline}</div>
                <span className="mt-3 text-sm font-semibold text-sage">Start →</span>
              </a>
            ))}
          </div>
          <details className="group mt-8">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-slate2 hover:text-ink">
              <span className="transition group-open:rotate-90">›</span> Browse all {MODULES.length} exercises
            </summary>
            <div className="mt-5">{catalogEl}</div>
          </details>
        </section>
      ) : (
        <section data-tour="catalog">
          <h2 className="eyebrow">{isOrgLearner ? "Explore more" : t("dash.exercises")}</h2>
          <p className="mb-5 mt-1 max-w-2xl text-sm text-slate2">{t("dash.framing")}</p>
          {catalogEl}
        </section>
      ))}

      <section className="mt-10">
        <h2 className="eyebrow mb-3">{t("dash.yourSessions")}</h2>
        <SessionsPanel sessions={sessions || []} me={user.id} />
      </section>

      <Footer />
      <Tour steps={DASHBOARD_TOUR} storageKey="tour-dash-1" welcomeTitle="Welcome to Superadditive" welcomeBody="AI-run exercises for your strategy, your career, and your business. Here's a 30-second tour so you know where everything is. You can replay it anytime from “Take a tour.”" />
    </main>
  );
}
