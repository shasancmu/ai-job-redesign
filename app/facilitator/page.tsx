import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, UNTAGGED } from "@/lib/admin";
import { facilitatorAccess, getActiveOrg } from "@/lib/orgs";
import { MODULES, moduleByExercise } from "@/lib/modules";
import { ROLE_META } from "@/lib/workflow";
import { canvasByExercise, scoreColor } from "@/lib/canvases";
import { analyze as negAnalyze, scenarioByExercise as negScenario, maxJointOf } from "@/lib/negotiation";
import { NegotiationScatter, NegotiationStrip } from "@/components/NegotiationPlot";
import ExposureCohort from "@/components/ExposureCohort";
import { AI_CELLS, HUMAN_CELLS, FEEDBACK_FIELDS, Cell } from "@/lib/exercise";
import AdminTools from "@/components/AdminTools";
import HeaderNav from "@/components/HeaderNav";
import Tour from "@/components/Tour";
import CanvasView from "@/components/CanvasView";

export const dynamic = "force-dynamic";

const HUB_TOUR = [
  { sel: '[data-tour="fac-live"]', title: "Run something live", body: "Start a live activity your whole room joins from their phones — a word cloud, a photo wall, the benchmark, or a network map. No sign-in needed for them." },
  { sel: '[data-tour="fac-cohorts"]', title: "Your cohorts", body: "Each cohort is a group going through a program. Open one to review the room's work, or make a new one. Your org's master cohort is the default 'everyone' group." },
  { sel: '[data-tour="fac-admin"]', title: "Admin tools", body: "Usage, experiments, and cost dashboards live here. (Directors: manage your people and instructors from the Organization page in your account menu.)" },
];

export default async function Facilitator({
  searchParams,
}: {
  searchParams: { cohort?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const access = await facilitatorAccess(user);
  if (!access.ok) redirect("/dashboard");

  // The facilitator view reads across all users, so it needs the service role.
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return (
      <Shell>
        <p className="text-slate-600">
          The facilitator dashboard needs the{" "}
          <code className="rounded bg-slate-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          environment variable. Add it (Supabase → Project Settings → API →
          service_role) and redeploy.
        </p>
      </Shell>
    );
  }

  // Scope the hub to the ACTIVE organization (the one selected in the header
  // switcher), so a director of several orgs sees one org's cohorts at a time.
  // A director/superadmin sees all of that org's classes; an instructor sees only
  // the ones they own within it. In the Personal context (no active org), a
  // superadmin sees everything and everyone else sees their own org-less classes.
  const activeOrg = await getActiveOrg(user);
  let visibleClasses: { code: string; name: string }[] | null = null; // null = all (superadmin, Personal)
  if (activeOrg) {
    const seesAllOrgClasses = access.superadmin || access.orgIds.includes(activeOrg.id);
    let cq = admin.from("classes").select("code, name").eq("org_id", activeOrg.id);
    if (!seesAllOrgClasses) cq = cq.eq("owner_id", user.id);
    const { data: orgClasses } = await cq;
    visibleClasses = ((orgClasses as any[]) || []).map((c) => ({ code: c.code, name: c.name }));
  } else if (!access.superadmin) {
    const { data: myClasses } = await admin.from("classes").select("code, name").eq("owner_id", user.id).is("org_id", null);
    visibleClasses = ((myClasses as any[]) || []).map((c) => ({ code: c.code, name: c.name }));
  }
  const visibleCohorts = visibleClasses ? visibleClasses.map((c) => c.code) : null;

  const cohort = searchParams.cohort;
  if (cohort && visibleCohorts && !visibleCohorts.includes(cohort)) redirect("/facilitator");
  return cohort ? (
    <CohortDetail admin={admin} cohort={cohort} />
  ) : (
    <Overview admin={admin} allowedCohorts={visibleCohorts} classes={visibleClasses} superadmin={access.superadmin} />
  );
}

// ---------------------------------------------------------------- Overview ---
async function Overview({ admin, allowedCohorts, classes, superadmin }: { admin: any; allowedCohorts: string[] | null; classes: { code: string; name: string }[] | null; superadmin: boolean }) {
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, cohort, status, host_id, guest_id, created_at")
    .order("created_at", { ascending: false });

  const allow = allowedCohorts ? new Set(allowedCohorts) : null;
  const groups = new Map<string, any[]>();
  for (const s of sessions || []) {
    // Facilitators only see their own cohorts; untagged sessions are superadmin-only.
    if (allow && !(s.cohort && allow.has(s.cohort))) continue;
    const key = s.cohort || UNTAGGED;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  // Show every cohort you own, even ones with no sessions yet, so a newly created
  // cohort is findable (to share its link or open it) before anyone has run it.
  const nameByCode = new Map<string, string>((classes || []).map((c) => [c.code, c.name]));
  for (const c of classes || []) if (!groups.has(c.code)) groups.set(c.code, []);

  const rows = Array.from(groups.entries()).sort((a, b) => {
    if (a[0] === UNTAGGED) return 1;
    if (b[0] === UNTAGGED) return -1;
    return a[0] < b[0] ? -1 : 1;
  });

  const totalPeople = new Set<string>();
  for (const arr of groups.values()) for (const s of arr) {
    if (s.host_id) totalPeople.add(s.host_id);
    if (s.guest_id) totalPeople.add(s.guest_id);
  }

  return (
    <Shell>
      {/* Header: identity + account, kept slick. Actions live on the page. */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-400">Teaching</div>
          <h1 className="mt-0.5 text-3xl text-ink">Cohorts</h1>
          <p className="mt-1 max-w-lg text-sm text-slate2">
            Run a live activity, open a cohort to teach or review the work, or set up a new one.
          </p>
        </div>
        <HeaderNav tour />
      </div>

      {/* Run something live, right now. */}
      <h2 className="eyebrow mb-3">Run something live</h2>
      <div data-tour="fac-live" className="mb-9 grid gap-3 sm:grid-cols-2">
        <Link href="/facilitator/cloud" className="card group flex items-center gap-4 p-5 transition hover:shadow-lift">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-soft text-2xl">🌥️</div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-ink">Live word cloud</div>
            <div className="text-sm text-slate2">Ask a question. Answers build into a cloud, live. No sign-in.</div>
          </div>
          <span className="shrink-0 text-slate-300 transition group-hover:text-ink">→</span>
        </Link>
        <Link href="/facilitator/photo" className="card group flex items-center gap-4 p-5 transition hover:shadow-lift">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-2xl">📷</div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-ink">Photo wall</div>
            <div className="text-sm text-slate2">The room photographs something. AI reads each; photos never stored.</div>
          </div>
          <span className="shrink-0 text-slate-300 transition group-hover:text-ink">→</span>
        </Link>
        <Link href="/facilitator/quiz" className="card group flex items-center gap-4 p-5 transition hover:shadow-lift">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-clay-soft text-2xl">⏱️</div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-ink">The Benchmark</div>
            <div className="text-sm text-slate2">A timed test. The room vs. the machine, scored live. No sign-in.</div>
          </div>
          <span className="shrink-0 text-slate-300 transition group-hover:text-ink">→</span>
        </Link>
        <Link href="/facilitator/network" className="card group flex items-center gap-4 p-5 transition hover:shadow-lift">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-soft text-2xl">🕸️</div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-ink">The Network</div>
            <div className="text-sm text-slate2">Map the room's real network, live and anonymous.</div>
          </div>
          <span className="shrink-0 text-slate-300 transition group-hover:text-ink">→</span>
        </Link>
      </div>

      <div data-tour="fac-cohorts" className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="eyebrow">Your cohorts</h2>
        <div className="flex items-center gap-3">
          {rows.length > 0 && (
            <span className="text-xs text-slate-400">{totalPeople.size} people across {rows.length} {rows.length === 1 ? "group" : "groups"}</span>
          )}
          <Link href="/facilitator/cohorts" className="btn-primary text-sm">+ New cohort</Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-slate-600">No sessions yet.</div>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate2">
            Create a cohort, or share a tagged link like{" "}
            <code className="rounded bg-slate-100 px-1">/dashboard?cohort=EXECED-XYZ-DATE</code>{" "}
            so participants' rooms group here.
          </p>
          <Link href="/facilitator/cohorts" className="btn-primary mt-4 inline-block text-sm">New cohort</Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rows.map(([key, list]) => {
            const people = new Set<string>();
            list.forEach((s) => {
              if (s.host_id) people.add(s.host_id);
              if (s.guest_id) people.add(s.guest_id);
            });
            const done = list.filter((s) => s.status === "done").length;
            const active = list.some((s) => s.status === "active");
            const untagged = key === UNTAGGED;
            const name = untagged ? "untagged" : (nameByCode.get(key) || key);
            const showCode = !untagged && name !== key;
            const detail = `/facilitator?cohort=${encodeURIComponent(key)}`;
            return (
              <li key={key}>
                <div className="card group flex items-center gap-3 p-5 transition hover:shadow-lift">
                  <Link href={detail} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className={"text-lg font-bold " + (untagged ? "font-mono text-slate-400" : "text-ink")}>
                        {name}
                      </span>
                      {active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-semibold text-sage">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage" /> active
                        </span>
                      )}
                    </div>
                    {showCode && <div className="mt-0.5 font-mono text-xs text-slate-400">{key}</div>}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate2">
                      {list.length === 0 ? (
                        <span className="text-slate-400">No runs yet, share the link to start</span>
                      ) : (
                        <>
                          <span><b className="font-semibold text-ink">{list.length}</b> {list.length === 1 ? "pair" : "pairs"}</span>
                          <span className="text-slate-300">·</span>
                          <span><b className="font-semibold text-ink">{people.size}</b> {people.size === 1 ? "participant" : "participants"}</span>
                          <span className="text-slate-300">·</span>
                          <span><b className="font-semibold text-ink">{done}</b> completed</span>
                        </>
                      )}
                    </div>
                  </Link>
                  <Link
                    href={`/facilitator/live?cohort=${encodeURIComponent(key)}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink transition hover:border-sage hover:bg-sage-soft"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-sage" /> Live
                  </Link>
                  <Link href={detail} aria-label="Open cohort" className="shrink-0 rounded-full p-2 text-slate-300 transition hover:bg-mist hover:text-ink">
                    →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Admin tools — moved here from the header. */}
      <section data-tour="fac-admin" className="mt-12">
        <h2 className="eyebrow mb-3">Admin tools</h2>
        <AdminTools superadmin={superadmin} />
      </section>

      <Tour
        steps={HUB_TOUR}
        storageKey="tour-hub-v1"
        welcomeTitle="Your teaching hub"
        welcomeBody="This is where you run cohorts and live activities. Here's a quick tour of what you can do."
      />
    </Shell>
  );
}

// ------------------------------------------------------------ CohortDetail ---
async function CohortDetail({ admin, cohort }: { admin: any; cohort: string }) {
  const untagged = cohort === UNTAGGED;

  let q = admin
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false });
  q = untagged ? q.is("cohort", null) : q.eq("cohort", cohort);
  const { data: sessions } = await q;

  const sessionIds = (sessions || []).map((s: any) => s.id);
  let workspaces: any[] = [];
  let docs: any[] = [];
  let profiles: any[] = [];
  if (sessionIds.length) {
    const { data: ws } = await admin
      .from("workspaces")
      .select("*")
      .in("session_id", sessionIds);
    workspaces = ws || [];
    const { data: wd } = await admin
      .from("workflow_docs")
      .select("*")
      .in("session_id", sessionIds);
    docs = wd || [];
    const ids = new Set<string>();
    (sessions || []).forEach((s: any) => {
      if (s.host_id) ids.add(s.host_id);
      if (s.guest_id) ids.add(s.guest_id);
    });
    if (ids.size) {
      const { data: ps } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", Array.from(ids));
      profiles = ps || [];
    }
  }

  const nameOf = (id?: string | null) =>
    (id && profiles.find((p) => p.id === id)?.display_name) || "—";
  const wsFor = (sessionId: string, authorId?: string | null) =>
    workspaces.find((w) => w.session_id === sessionId && w.author_id === authorId);
  const docFor = (sessionId: string) =>
    docs.find((d) => d.session_id === sessionId);

  // ---- Class overview (only when this cohort is a class) ----
  let classOverview: any = null;
  if (!untagged) {
    const { data: klass } = await admin
      .from("classes")
      .select("id, name, modules")
      .eq("code", cohort)
      .maybeSingle();
    if (klass) {
      const [{ count: joined }, { data: bench }, { data: net }] = await Promise.all([
        admin.from("class_members").select("user_id", { count: "exact", head: true }).eq("class_id", klass.id),
        admin.from("benchmark_results").select("user_id").eq("cohort", cohort),
        admin.from("network_responses").select("user_id").eq("cohort", cohort),
      ]);
      const benchUsers = new Set((bench || []).map((r: any) => r.user_id)).size;
      const netUsers = new Set((net || []).map((r: any) => r.user_id)).size;
      const bySession = (exercise: string) => {
        const ss = (sessions || []).filter((s: any) => s.exercise === exercise);
        const users = new Set<string>();
        ss.forEach((s: any) => {
          if (s.host_id) users.add(s.host_id);
          if (s.guest_id) users.add(s.guest_id);
        });
        return users.size;
      };
      const statFor = (slug: string): number => {
        if (slug === "benchmark") return benchUsers;
        if (slug === "network") return netUsers;
        if (slug === "reimagine-job") return bySession("job");
        if (slug === "reimagine-workflow") return bySession("workflow");
        if (slug === "solo-ai") return bySession("solo");
        if (slug === "execution-4a") return bySession("four-a");
        if (slug === "balanced-scorecard") return bySession("scorecard");
        if (slug === "good-business") return bySession("venture");
        if (slug === "close-the-offer") return bySession("negotiation");
        if (slug === "name-your-price") return bySession("haggle");
        if (slug === "career-x-ray") return bySession("career-xray");
        if (slug === "jd-x-ray") return bySession("jd-xray");
        if (slug === "ai-canvas") return bySession("gas");
        if (slug === "opportunity-capability") return bySession("ocfit");
        if (slug === "test-the-bet") return bySession("experiment");
        return 0;
      };
      classOverview = {
        name: klass.name,
        joined: joined ?? 0,
        rows: ((klass.modules as string[]) || []).map((slug) => ({
          slug,
          name: MODULES.find((m) => m.slug === slug)?.name || slug,
          count: statFor(slug),
        })),
      };
    }
  }

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/facilitator"
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            ← All cohorts
          </Link>
          <h1 className="mt-1 font-mono text-2xl font-bold">
            {untagged ? "(untagged)" : cohort}
          </h1>
          <p className="text-sm text-slate-500">
            {(sessions || []).length} pairs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/facilitator/live?cohort=${encodeURIComponent(cohort)}`}
            className="btn-ghost text-sm"
          >
            ● Live cockpit
          </Link>
          <Link
            href={`/facilitator/aggregate?cohort=${encodeURIComponent(cohort)}`}
            className="btn-ghost text-sm"
          >
            Aggregate
          </Link>
          <Link
            href={`/facilitator/benchmark?cohort=${encodeURIComponent(cohort)}`}
            className="btn-ghost text-sm"
          >
            Benchmark
          </Link>
          <Link
            href={`/facilitator/network?cohort=${encodeURIComponent(cohort)}`}
            className="btn-ghost text-sm"
          >
            Network
          </Link>
          {sessionIds.length > 0 && (
            <a
              href={`/facilitator/export?cohort=${encodeURIComponent(cohort)}`}
              className="btn-primary text-sm"
            >
              ↓ CSV
            </a>
          )}
        </div>
      </div>

      {!untagged && (() => {
        const opts = [
          { key: "job", label: "Redesign your job" },
          { key: "workflow", label: "Redesign your workflow" },
        ].filter((pe) => (sessions || []).some((s: any) => s.exercise === pe.key && s.host_id && s.guest_id));
        if (!opts.length) return null;
        return (
          <div className="mb-6 rounded-2xl border border-line bg-mist/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink"><span aria-hidden>🎓</span> Class summary deck</div>
            <p className="mt-0.5 text-xs text-slate-500">
              A projector-ready summary of what the room did together: the pairs, what they kept human, what they gave AI, and the takeaways.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {opts.map((pe) => (
                <Link
                  key={pe.key}
                  href={`/facilitator/summary?cohort=${encodeURIComponent(cohort)}&exercise=${pe.key}`}
                  className="btn-primary text-sm"
                >
                  Present: {pe.label} →
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {classOverview && <ClassOverview data={classOverview} />}

      <FourAHeatmap
        rows={(sessions || [])
          .filter((s: any) => s.exercise === "four-a")
          .map((s: any) => ({ name: nameOf(s.host_id), ratings: (wsFor(s.id, s.host_id)?.canvas?.ratings as any) || {} }))
          .filter((r: any) => Object.keys(r.ratings).length > 0)}
      />

      <ExposureCohort
        cohort={cohort}
        rows={(sessions || [])
          .filter((s: any) => s.exercise === "career-xray" || s.exercise === "jd-xray")
          .map((s: any) => {
            const x = wsFor(s.id, s.host_id)?.canvas?.xray;
            if (!x || !(x.tasks?.length > 0)) return null;
            return { name: nameOf(s.host_id), role: x.occupation || "", topDown: x.topDownExposure || 0, bottomUp: x.bottomUpExposure || 0, exercise: s.exercise, tasks: x.tasks || [] };
          })
          .filter(Boolean) as any[]}
      />

      {["negotiation", "haggle"].map((ex) => {
        const scn = negScenario(ex);
        if (!scn) return null;
        const rows = (sessions || [])
          .filter((s: any) => s.exercise === ex)
          .map((s: any) => {
            const st = wsFor(s.id, s.host_id)?.canvas || {};
            const done = (st.terms && Object.keys(st.terms).length > 0) || st.noDeal;
            if (!done) return null;
            const a = negAnalyze(scn, st.terms || {}, !!st.noDeal);
            return { name: nameOf(s.host_id), you: a.you, them: a.them, noDeal: a.noDeal, price: a.agreedPrice || 0 };
          })
          .filter(Boolean) as any[];
        if (!rows.length) return null;
        return (
          <div key={ex} className="card mb-6 p-5">
            <div className="text-lg font-bold text-ink">{scn.name}: the room</div>
            <div className="mt-3">
              {scn.kind === "multi-issue" ? (
                <NegotiationScatter rows={rows} maxJoint={maxJointOf(scn)} counterpartName={scn.counterpartName} />
              ) : (
                <NegotiationStrip rows={rows} lo={scn.theirReservation} hi={scn.yourReservation} />
              )}
            </div>
          </div>
        );
      })}

      {(sessions || []).length === 0 ? (
        <p className="text-slate-500">No sessions in this cohort.</p>
      ) : (
        <div className="space-y-6">
          {(sessions || []).map((s: any) => (
            <div key={s.id} className="card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm font-semibold tracking-widest">
                    {s.code}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {moduleByExercise(s.exercise || "job")?.name || s.exercise}
                  </span>
                  <span className="text-sm text-slate-600">
                    {nameOf(s.host_id)}
                    {s.exercise !== "solo" && s.exercise !== "workflow-solo" && (
                      <>
                        {" "}
                        <span className="text-slate-300">&amp;</span>{" "}
                        {s.guest_id ? nameOf(s.guest_id) : "— (no partner)"}
                      </>
                    )}
                  </span>
                </div>
                <span
                  className={
                    "rounded-full px-2.5 py-1 text-xs font-medium " +
                    (s.status === "done"
                      ? "bg-green-100 text-green-700"
                      : s.status === "active"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-600")
                  }
                >
                  {s.status}
                </span>
              </div>

              {s.exercise === "career-xray" || s.exercise === "jd-xray" ? (
                <CareerFacilitatorView ws={wsFor(s.id, s.host_id)} code={s.code} authorName={nameOf(s.host_id)} />
              ) : negScenario(s.exercise || "") ? (
                <NegotiationFacilitatorView exercise={s.exercise} ws={wsFor(s.id, s.host_id)} authorName={nameOf(s.host_id)} />
              ) : canvasByExercise(s.exercise || "") ? (
                <CanvasFacilitatorView exercise={s.exercise} ws={wsFor(s.id, s.host_id)} code={s.code} authorName={nameOf(s.host_id)} />
              ) : s.exercise === "workflow" || s.exercise === "workflow-solo" ? (
                <WorkflowView doc={docFor(s.id)} code={s.code} />
              ) : s.exercise === "solo" ? (
                <SoloView authorName={nameOf(s.host_id)} ws={wsFor(s.id, s.host_id)} code={s.code} />
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  <ParticipantColumn
                    authorName={nameOf(s.host_id)}
                    subjectName={nameOf(s.guest_id)}
                    ws={wsFor(s.id, s.host_id)}
                  />
                  <ParticipantColumn
                    authorName={nameOf(s.guest_id)}
                    subjectName={nameOf(s.host_id)}
                    ws={wsFor(s.id, s.guest_id)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

function ParticipantColumn({
  authorName,
  subjectName,
  ws,
}: {
  authorName: string;
  subjectName: string;
  ws: any;
}) {
  if (!ws) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">
        {authorName}: no data.
      </div>
    );
  }
  const grid = ws.grid || {};
  const fb = ws.feedback || {};
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-sm font-bold text-slate-800">{authorName}</div>

      <Field label="Their job today">
        {ws.owner_job_title && <span className="font-medium">{ws.owner_job_title}. </span>}
        {ws.owner_job_description}
      </Field>

      <div className="my-3 border-t border-slate-100 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {authorName}&apos;s redesign of {subjectName}
      </div>

      <Field label="Strategic outcome">{ws.strategic_outcome}</Field>
      <Field label="Their real job">{ws.real_job}</Field>
      <Field label="Insight">{ws.insight}</Field>

      <GridBlock label="Give to AI" role="ai" cells={AI_CELLS} grid={grid} />
      <GridBlock label="Keep human" role="human" cells={HUMAN_CELLS} grid={grid} />

      <Field label="New job description">{ws.new_job_description}</Field>
      <Field label="Final reimagined job">{ws.final_description}</Field>

      {FEEDBACK_FIELDS.some((f) => (fb[f.key] || "").trim()) && (
        <div className="mt-3">
          <div className="mb-1 text-xs font-semibold text-slate-500">
            Feedback received
          </div>
          <div className="space-y-1">
            {FEEDBACK_FIELDS.map((f) =>
              (fb[f.key] || "").trim() ? (
                <div key={f.key} className="flex gap-2 text-sm">
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: f.color }}
                  >
                    {f.symbol}
                  </span>
                  <span className="text-slate-600">{fb[f.key]}</span>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClassOverview({ data }: { data: any }) {
  const joined = data.joined || 0;
  return (
    <div className="card mb-6 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-lg font-bold text-ink">{data.name}</div>
        <div className="text-sm text-slate-500">
          <span className="text-2xl font-bold text-ink">{joined}</span> joined
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        {data.rows.map((r: any) => {
          const pct = joined ? Math.min(100, Math.round((r.count / joined) * 100)) : 0;
          return (
            <div key={r.slug} className="flex items-center gap-3">
              <div className="w-40 shrink-0 truncate text-sm text-slate-600">{r.name}</div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-sage" style={{ width: `${pct}%` }} />
              </div>
              <div className="w-24 shrink-0 text-right text-sm text-slate-600">
                <span className="font-semibold text-ink">{r.count}</span>
                {joined ? <span className="text-slate-400"> / {joined}</span> : ""}
              </div>
            </div>
          );
        })}
        {data.rows.length === 0 && (
          <div className="text-sm text-slate-400">No modules in this class yet.</div>
        )}
      </div>
    </div>
  );
}

function SoloView({ authorName, ws, code }: { authorName: string; ws: any; code: string }) {
  if (!ws) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">
        {authorName}: no data.
      </div>
    );
  }
  const chat: any[] = ws.interview_chat || [];
  const hasPlan =
    ws.plan && (ws.plan.headline || ws.plan.summary || (ws.plan.human?.length || 0) + (ws.plan.ai?.length || 0) > 0);
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {hasPlan && (
        <div className="md:col-span-2">
          <Link href={`/plan/${code}`} className="text-sm font-medium text-sage hover:underline">
            View implementation plan →
          </Link>
        </div>
      )}
      <ParticipantColumn authorName={authorName} subjectName="their own job" ws={ws} />
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          AI interview transcript
        </div>
        {chat.length === 0 ? (
          <div className="mt-2 text-sm text-slate-300">— none —</div>
        ) : (
          <div className="mt-2 space-y-2">
            {chat.map((m, i) => (
              <div key={i} className="text-sm">
                <span className={m.role === "user" ? "font-semibold text-slate-700" : "font-semibold text-ai"}>
                  {m.role === "user" ? `${authorName}: ` : "AI: "}
                </span>
                <span className="text-slate-600">{m.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FourAHeatmap({ rows }: { rows: { name: string; ratings: Record<string, number> }[] }) {
  if (!rows.length) return null;
  const def = canvasByExercise("four-a");
  const dims = def?.ratings || [];
  const avg = (key: string) => {
    const vals = rows.map((r) => r.ratings[key]).filter((v) => typeof v === "number");
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };
  const Cell = ({ v }: { v?: number }) =>
    typeof v === "number" ? (
      <span
        className="inline-flex h-8 w-full min-w-[52px] items-center justify-center rounded-md text-xs font-semibold text-white"
        style={{ background: scoreColor(v) }}
      >
        {v}
      </span>
    ) : (
      <span className="inline-flex h-8 w-full min-w-[52px] items-center justify-center rounded-md bg-slate-100 text-xs text-slate-300">
        —
      </span>
    );

  return (
    <div className="card mb-6 p-5">
      <div className="flex items-baseline justify-between">
        <div className="text-lg font-bold text-ink">4A execution: the room</div>
        <div className="text-sm text-slate-500">{rows.length} responses</div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="grid items-center gap-2" style={{ gridTemplateColumns: `140px repeat(${dims.length}, 1fr)` }}>
            <div />
            {dims.map((d) => (
              <div key={d.key} className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                {d.label}
              </div>
            ))}
            {rows.map((r, i) => (
              <Fragment key={i}>
                <div className="truncate pr-2 text-sm text-slate-600">{r.name}</div>
                {dims.map((d) => (
                  <Cell key={d.key} v={r.ratings[d.key]} />
                ))}
              </Fragment>
            ))}
            <div className="pt-1 text-sm font-semibold text-ink">Average</div>
            {dims.map((d) => (
              <div key={d.key} className="pt-1">
                <Cell v={avg(d.key)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">Red = execution is breaking on that dimension; green = strong. The weakest column is where the room needs the most help.</p>
    </div>
  );
}

function CareerFacilitatorView({ ws, code, authorName }: { ws: any; code: string; authorName: string }) {
  const x = ws?.canvas?.xray;
  const done = x && (x.summary || (x.tasks?.length || 0) > 0);
  if (!done) {
    return <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">{authorName}: no analysis yet.</div>;
  }
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-600">
          {x.occupation && <span className="font-medium text-ink">{x.occupation}</span>} · top-down <b className="text-ink">{x.topDownExposure}%</b> vs. bottom-up <b className="text-ink">{x.bottomUpExposure}%</b> exposed
        </div>
        <Link href={`/career/${code}`} className="text-sm font-medium text-sage hover:underline">View X-ray →</Link>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>{x.automateShare}% automate</span>
        <span>{x.augmentShare}% augment</span>
        <span>{x.humanShare}% human</span>
        <span>{(x.newTasks?.length || 0)} new tasks</span>
      </div>
    </div>
  );
}

function NegotiationFacilitatorView({ exercise, ws, authorName }: { exercise: string; ws: any; authorName: string }) {
  const scn = negScenario(exercise);
  const state = ws?.canvas || {};
  const hasDeal = state.terms && Object.keys(state.terms).length > 0;
  if (!scn || (!hasDeal && !state.noDeal)) {
    return <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">{authorName}: not finished yet.</div>;
  }
  const a = negAnalyze(scn, state.terms || {}, !!state.noDeal);
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="rounded-xl border border-slate-200 p-4">
        {a.noDeal ? (
          <div className="text-sm text-clay">No deal: walked away.</div>
        ) : scn.kind === "multi-issue" ? (
          <>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>You: <b className="text-ink">{a.you}</b></span>
              <span>{scn.counterpartName}: <b className="text-ink">{a.them}</b></span>
              <span>Joint: <b className="text-ink">{a.efficiency}%</b></span>
            </div>
            <div className="mt-3 space-y-1">
              {a.issues!.map((it) => (
                <div key={it.key} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{it.label}</span>
                  <span className="text-slate-700">{it.chosen} {it.atOptimal ? <span className="text-sage">✓</span> : ""}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Price: <b className="text-ink">${(a.agreedPrice || 0).toLocaleString()}</b></span>
            <span>You saved: <b className="text-ink">${a.you.toLocaleString()}</b></span>
            <span>Gap claimed: <b className="text-ink">{a.maxJoint ? Math.round((a.you / a.maxJoint) * 100) : 0}%</b></span>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Coach&apos;s debrief</div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{state.feedback || "— not generated —"}</p>
      </div>
    </div>
  );
}

function CanvasFacilitatorView({
  exercise,
  ws,
  code,
  authorName,
}: {
  exercise: string;
  ws: any;
  code: string;
  authorName: string;
}) {
  const def = canvasByExercise(exercise);
  const canvas = ws?.canvas || {};
  const hasContent =
    def &&
    (canvas.synthesis ||
      canvas.verdict ||
      Object.values(canvas.fields || {}).some((v: any) => (Array.isArray(v) ? v.length : v)));
  if (!def || !hasContent) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">
        {authorName}: no canvas yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-slate-800">{canvas.subject || def.name}</div>
        <Link href={`/canvas/${code}`} className="text-sm font-medium text-sage hover:underline">
          View full canvas →
        </Link>
      </div>
      <CanvasView def={def} canvas={canvas} embedded />
    </div>
  );
}

function WorkflowView({ doc, code }: { doc: any; code: string }) {
  if (!doc) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">
        No workflow data yet.
      </div>
    );
  }
  const analysis: any = doc.analysis || {};
  const flow: any[] = analysis.flow?.length ? analysis.flow : doc.steps || [];
  const opps: any[] = analysis.opportunities || [];
  const to: any = analysis.tradeoffs || {};
  const analyzed = analysis.summary || opps.length > 0 || analysis.tradeoffs;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-slate-800">{doc.name || "—"}</div>
        {analyzed && (
          <Link href={`/workflow-plan/${code}`} className="text-sm font-medium text-sage hover:underline">
            View full plan →
          </Link>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <Field label="Why redesign">{doc.why}</Field>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {analysis.flow?.length ? "Redesigned flow" : "Current flow (as-is)"}
          </div>
          <div className="mt-1 space-y-1">
            {flow.length === 0 ? (
              <span className="text-slate-300">—</span>
            ) : (
              flow.map((st: any, i: number) => {
                const meta = ROLE_META[st.role] || ROLE_META[""];
                return (
                  <div key={st.id || i} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-right text-slate-400">{i + 1}</span>
                    <span className="flex-1 text-slate-700">{st.text}</span>
                    {st.role && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        {meta.label}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          {analysis.summary && <Field label="Where AI helps">{analysis.summary}</Field>}
          {opps.length > 0 && (
            <div className="mt-2 text-sm">
              <div className="font-medium text-slate-500">Start this week</div>
              <ul className="mt-0.5 space-y-0.5">
                {opps.map((o: any, i: number) => (
                  <li key={i} className="flex gap-1.5 text-slate-600">
                    <span className="text-slate-300">•</span>
                    <span><span className="font-medium text-slate-700">{o.title}:</span> {o.outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.tradeoffs && (
            <div className="mt-3 text-sm">
              <div className="font-medium text-slate-500">Trade-off plan</div>
              <Field label="Outcomes → Better">{to.outcomes?.aim}</Field>
              <Field label="Capabilities → Accuracy">{to.capabilities?.aim}</Field>
              <Field label="Control → Structure">{to.control?.aim}</Field>
            </div>
          )}
          <Field label="Stop / Start">{doc.stop_start}</Field>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  const empty =
    children == null ||
    (typeof children === "string" && children.trim() === "") ||
    (Array.isArray(children) && children.join("").trim() === "");
  return (
    <div className="mt-2 text-sm">
      <span className="font-medium text-slate-500">{label}: </span>
      {empty ? (
        <span className="text-slate-300">—</span>
      ) : (
        <span className="whitespace-pre-wrap text-slate-700">{children}</span>
      )}
    </div>
  );
}

function GridBlock({
  label,
  role,
  cells,
  grid,
}: {
  label: string;
  role: "ai" | "human";
  cells: Cell[];
  grid: Record<string, string[]>;
}) {
  const pairs = cells
    .map((c) => ({ label: c.label, items: grid[c.key] || [] }))
    .filter((x) => x.items.length > 0);
  const accent = role === "ai" ? "text-ai" : "text-human";
  return (
    <div className="mt-2 text-sm">
      <div className={"font-semibold " + accent}>{label}</div>
      {pairs.length === 0 ? (
        <span className="text-slate-300">—</span>
      ) : (
        <div className="mt-0.5 space-y-1">
          {pairs.map((p) => (
            <div key={p.label}>
              <span className="font-medium text-slate-600">{p.label}</span>
              <ul className="mt-0.5 space-y-0.5">
                {p.items.map((it, i) => (
                  <li key={i} className="flex gap-1.5 text-slate-500">
                    <span className="text-slate-300">•</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Shell({ children }: { children: any }) {
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>;
}
