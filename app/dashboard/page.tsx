import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { runWallet, runsLeftByModule, grantedModuleSlugs, alumniOffer } from "@/lib/access";
import { roleplayCatalogMap } from "@/lib/mechanics/store";
import { interviewMetaBySlugs } from "@/lib/customModules";
import { PAYMENTS_ENABLED } from "@/lib/stripe";
import { isAdmin } from "@/lib/admin";
import { claimInvites, getMyOrgs, getActiveOrg, facilitatorAccess, masterCohortCode } from "@/lib/orgs";
import OrgSwitcher from "@/components/OrgSwitcher";
import AccountMenu from "@/components/AccountMenu";
import FacilitatorWelcome from "@/components/FacilitatorWelcome";
import { titleCaseName } from "@/lib/name";
import { MODULES, moduleBySlug } from "@/lib/modules";
import { levelFor, loadBundles, bundlesFor, bundlesForSlug, nextCertificateStep } from "@/lib/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { viewAsTarget } from "@/lib/viewAs";
import ViewAsBanner from "@/components/ViewAsBanner";
import { listAuthoredModules } from "@/lib/moduleCatalog";
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

  // Role-appropriate home. The org / class / cohort machinery is for staff;
  // a learner should see their program (assigned work + progress), not the
  // whole library. So an org member gets a cohort-first home and the general
  // library is hidden — unless the org opts members into free exploration.
  const activeMembership = activeOrg ? myOrgs.find((m) => m.org.id === activeOrg.id) : null;
  const isStaffHere = facAccess.superadmin || activeMembership?.role === "instructor" || activeMembership?.role === "director";
  const isOrgLearner = !!activeOrg && !isStaffHere;
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
      {isProxy && <ViewAsBanner email={proxy!.email} />}
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
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5">
          {activeOrg.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeOrg.logo_url} alt="" className="h-10 w-10 shrink-0 rounded object-contain" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-mist text-sm font-bold text-slate2">
              {activeOrg.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 leading-tight">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">Your cohort</div>
            <div className="truncate text-sm font-bold text-ink">{cohortName || "All members"}</div>
            <div className="truncate text-xs text-slate-400">{activeOrg.name}</div>
          </div>
          {isOrgLearner && (
            <div className="ml-auto shrink-0 rounded-full bg-sage/10 px-2.5 py-1 text-[11px] font-semibold text-sage">
              Included — free to run
            </div>
          )}
        </div>
      )}

      <FacilitatorWelcome orgs={myOrgs.filter((m) => m.role !== "member").map((m) => ({ slug: m.org.slug, name: m.org.name, role: m.role }))} />

      <EnrichOnce />

      <FollowUps items={followUps} />

      {/* Continue where you left off — the top prompt, at the moment ability is
          highest (no re-deciding). If it counts toward a certificate, say so. */}
      {continueItem && (
        <a href={continueItem.href} className="group mb-8 flex items-center justify-between gap-3 rounded-2xl border-2 border-sage/40 bg-gradient-to-br from-white to-sage/5 p-4 transition hover:shadow-sm">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">Pick up where you left off</div>
            <div className="mt-0.5 truncate text-sm font-bold text-ink group-hover:text-sage">{continueItem.name}</div>
            <div className="truncate text-xs text-slate-400">{continueCert ? `Counts toward your ${continueCert} certificate` : "You were partway through — finish it in a few minutes."}</div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-sage">Resume &rarr;</span>
        </a>
      )}

      {/* Runs balance. Alumni in their window get the time-boxed pack nudge;
          low/empty balances get a top-up prompt; a fresh consumer with runs in
          hand sees a quiet counter. Institutional learners never see this. */}
      {showRuns && offer.active ? (
        <a href="/paywall" className="mb-8 flex items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-white p-4 transition hover:shadow-sm">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-clay">Cohort alumni · ends in {offer.daysLeft} day{offer.daysLeft === 1 ? "" : "s"}</div>
            <div className="mt-0.5 text-sm font-bold text-ink">{runsBalance} runs left — top up at your alumni price</div>
            <div className="text-xs text-slate-400">Your lowest per-run price. Runs never expire.</div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-ink">Get runs →</span>
        </a>
      ) : showRuns && (runsBalance <= 3 || !isNewConsumer) ? (
        <a href="/paywall" className={"mb-8 flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 transition hover:shadow-sm " + (runsBalance === 0 ? "border-2 border-ink" : "border-line")}>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">Your runs</div>
            <div className="mt-0.5 text-sm font-bold text-ink">{runsBalance === 0 ? "You're out of runs" : `${runsBalance} run${runsBalance === 1 ? "" : "s"} left`}</div>
            <div className="text-xs text-slate-400">{runsBalance === 0 ? "Add a pack to keep going — spend runs on any exercise." : "One run = one exercise. Top up anytime; runs never expire."}</div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-sage">{runsBalance === 0 ? "Get runs →" : "Top up →"}</span>
        </a>
      ) : null}

      {nextStep && (
        <a href={`/start/${nextStep.nextSlug}`} className="group mb-8 block rounded-2xl border border-line bg-white p-4 transition hover:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-sage">
                You&apos;re {nextStep.progressPct}% of the way to the {nextStep.name} certificate
              </div>
              <div className="mt-0.5 truncate text-sm font-bold text-ink group-hover:text-sage">Next: {nextStep.nextName}</div>
              <div className="text-xs text-slate-400">Just {nextStep.remaining} more to earn it — keep the momentum.</div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-sage">Continue &rarr;</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-mist">
            <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${Math.max(6, nextStep.progressPct)}%` }} />
          </div>
        </a>
      )}

      {(facAccess.superadmin || facAccess.orgIds.length > 0) && (
        <a href="/studio/upload" className="group mb-8 flex items-center gap-4 rounded-2xl border border-ai/30 bg-gradient-to-br from-white to-mist/40 p-4 transition hover:shadow-sm">
          <div className="text-2xl">📎</div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-ink group-hover:text-ai">Turn your materials into a module</div>
            <div className="text-xs text-slate-500">Upload your slides or readings and get a launch-ready draft. Or open the <span className="underline">Studio</span> for all your tools.</div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-ai">Build →</span>
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
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
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

      {myCapstone && (
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
      )}

      {showLibrary && (isNewConsumer && startHere.length > 0 ? (
        // A first-time consumer: one clear place to start, with the full library
        // tucked behind a disclosure so the first screen isn't 80 choices.
        <section data-tour="catalog">
          <h2 className="eyebrow">Start here</h2>
          <p className="mb-5 mt-1 max-w-2xl text-sm text-slate2">New to Superadditive? Pick one and do it — about 20 minutes, and you walk away with something real, not a completion checkmark.</p>
          <div className="grid gap-3 sm:grid-cols-3">
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
