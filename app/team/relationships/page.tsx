import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor, getActiveOrg, getOrgById } from "@/lib/orgs";
import { gatherCareOS, SPAN_HEALTHY, SPAN_MAX, type CarePerson, type Carer } from "@/lib/relationshipOS";
import { SEGMENTS } from "@/lib/pushes";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import PushComposer from "@/components/PushComposer";
import ReachOut from "@/components/ReachOut";
import PersonLookup from "@/components/PersonLookup";
import RollupReport from "@/components/RollupReport";

export const dynamic = "force-dynamic";

const DOT: Record<string, string> = { strong: "#059669", cooling: "#B45309", at_risk: "#C2410C", dormant: "#94A3B8" };
const BUCKET_LABEL: Record<string, string> = { strong: "strong", cooling: "cooling", at_risk: "at risk", dormant: "quiet" };

function ago(d: number | null): string {
  if (d == null) return "not yet";
  if (d === 0) return "today";
  if (d < 30) return `${d}d quiet`;
  if (d < 365) return `${Math.round(d / 30)}mo quiet`;
  return `${Math.round(d / 365)}y quiet`;
}

// A person, shown as someone to be cared for — context first, so the human who
// reaches out already knows something true about them (the memory prosthetic).
function PersonLine({ p, note }: { p: CarePerson; note?: string }) {
  return (
    <Link href={`/team/person/${p.userId}`} className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-mist/40">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: DOT[p.bucket] }} />
      <span className="min-w-0 flex-1 truncate font-medium text-ink">{p.name}</span>
      <span className="hidden shrink-0 truncate text-xs text-slate-400 sm:block">{note ?? (p.lastModule ? `last: ${p.lastModule}` : "")}</span>
      <span className="shrink-0 text-xs text-slate-400">{ago(p.lastActiveDays)}</span>
    </Link>
  );
}

function CarerRow({ c }: { c: Carer }) {
  const pct = Math.min(100, Math.round((c.load / SPAN_MAX) * 100));
  const color = c.status === "over" ? "#C2410C" : c.status === "stretched" ? "#B45309" : "#059669";
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="truncate text-sm font-medium text-ink">{c.name}</span>
        {!c.present && <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">left</span>}
        <span className="block truncate text-[11px] text-slate-400">{c.cohorts.slice(0, 2).join(", ")}{c.cohorts.length > 2 ? "…" : ""}</span>
      </span>
      <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-mist sm:w-40">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums" style={{ color }}>{c.load}</span>
    </div>
  );
}

// The Relationship OS — an instrument of care, not a report. It reads only the
// viewer's OWN span (a director sees the whole tree; a program director their
// programs; an instructor their cohorts) and asks one question: is every person
// here known by a human? Then it helps that human be helpful.
export const metadata = { title: "Relationships" };

export default async function RelationshipsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/team/relationships");

  const role = await roleFor(user);
  const staffOrgIds = new Set([...role.directorOrgIds, ...role.programDirectorOrgIds, ...role.instructorOrgIds]);
  const active = await getActiveOrg(user).catch(() => null);
  let org = active && (role.superadmin || staffOrgIds.has(active.id)) ? active : null;
  if (!org) {
    const anyId = role.directorOrgIds[0] || role.programDirectorOrgIds[0] || role.instructorOrgIds[0];
    if (anyId) org = await getOrgById(anyId);
    else if (role.superadmin && active) org = active;
  }
  if (!org) redirect(role.superadmin ? "/admin/orgs" : "/dashboard");

  const admin = createAdminClient();
  const os = await gatherCareOS(admin, org, role, user.id);
  const coveragePct = Math.round(os.coverage * 100);
  const roleLabel = os.role === "director" ? "Across the school" : os.role === "program_director" ? "Across your programs" : "Your cohorts";
  const segments = SEGMENTS.map((s) => ({ ...s, count: s.key === "everyone" ? os.people : 0 }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/team" className="text-sm text-slate2 hover:text-ink">← Team</Link><HeaderNav /></div>
      </header>

      <span className="eyebrow text-sage">Relationship OS</span>
      <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">{org.name}</h1>
      <p className="mt-2 text-sm font-medium text-slate-500">{roleLabel} · {os.spanLabel}</p>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate2">
        Not a mailing list. This asks one question — <b>is every person here known by a human?</b> — and then helps you be that human. It surfaces and routes; it never reaches out for you. A note in your voice is worth more than anything a system could send.
      </p>

      <div className="mt-5"><PersonLookup /></div>

      {os.people === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-6 text-center text-sm text-slate2">
          No one in your {os.role === "instructor" ? "cohorts" : "programs"} yet. As people join and work, they&apos;ll appear here — each one someone to know.
        </div>
      ) : (
        <>
          {/* Care coverage — the hero. Principle 2: every person known by a human. */}
          <section className="mt-8">
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="eyebrow text-slate-400">Care coverage</div>
                  <div className="mt-1 text-4xl font-bold text-ink tabular-nums">{coveragePct}%</div>
                  <div className="mt-0.5 text-sm text-slate2">{os.covered.toLocaleString()} of {os.people.toLocaleString()} known by a human</div>
                </div>
                <div className="text-right">
                  <div className={"text-2xl font-bold tabular-nums " + (os.orphaned.length ? "text-orange-700" : "text-emerald-700")}>{os.orphaned.length}</div>
                  <div className="text-xs text-slate2">carried only<br />by the system</div>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-mist">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${coveragePct}%` }} />
              </div>
              {os.orphaned.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate2">These people are here but in no one&apos;s cohort — assign each to a human before they drift.</p>
                  <div className="mt-2 overflow-hidden rounded-xl border border-line">
                    {os.orphaned.slice(0, 8).map((p, i) => (
                      <div key={p.userId} className={"flex items-center " + (i > 0 ? "border-t border-line" : "")}>
                        <div className="min-w-0 flex-1"><PersonLine p={p} /></div>
                        <div className="pr-2"><ReachOut userId={p.userId} name={p.name} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Understand the whole span — care from understanding, at scale. */}
          <section className="mt-8">
            <h2 className="eyebrow mb-1">Understand {os.role === "director" ? "your school" : os.role === "program_director" ? "your programs" : "your cohort"}</h2>
            <p className="mb-3 text-sm text-slate2">A reading of who these people are and what they need — the way you&apos;d read one student, across the whole group.</p>
            <RollupReport label={os.role === "director" ? "your school" : os.role === "program_director" ? "your programs" : "your cohort"} />
          </section>

          {/* Programs — the recursion of specializing-in-people (principle 5). */}
          {os.role !== "instructor" && os.programs.length > 0 && (
            <section className="mt-8">
              <h2 className="eyebrow mb-1">Your programs</h2>
              <p className="mb-3 text-sm text-slate2">You don&apos;t carry everyone — you carry the people who carry them. Each program is run by its director and its instructors.</p>
              <div className="space-y-2">
                {os.programs.map((pr) => (
                  <div key={pr.unitId} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white p-4">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-ink">{pr.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {pr.directors.length ? `Director: ${pr.directors.map((d) => d.name).join(", ")}` : <span className="text-orange-700">No program director yet</span>}
                        {" · "}{pr.carers} carer{pr.carers === 1 ? "" : "s"} · {pr.people} {pr.people === 1 ? "person" : "people"}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={"text-sm font-semibold tabular-nums " + (pr.people && pr.covered === pr.people ? "text-emerald-700" : "text-amber-700")}>{pr.people ? Math.round((pr.covered / pr.people) * 100) : 100}%</div>
                      <div className="text-[11px] text-slate-400">covered</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Carers & span load — principle 3 (respect the budget) + 4 (add humans). */}
          {os.carers.length > 0 && (
            <section className="mt-8">
              <h2 className="eyebrow mb-1">Who carries whom</h2>
              <p className="mb-3 text-sm text-slate2">A person can only truly know so many — roughly {SPAN_HEALTHY} well, {SPAN_MAX} at the limit. Past that, the relationship thins to a transaction. The fix is never more automation; it&apos;s another human.</p>
              <div className="overflow-hidden rounded-2xl border border-line bg-white">
                {os.carers.slice(0, 12).map((c, i) => <div key={c.userId} className={i > 0 ? "border-t border-line" : ""}><CarerRow c={c} /></div>)}
              </div>
              {os.overloaded.length > 0 && (
                <div className="mt-3 rounded-xl border-2 border-orange-200 bg-orange-50/60 p-3 text-sm text-orange-900">
                  <b>{os.overloaded.length} {os.overloaded.length === 1 ? "carer is" : "carers are"} beyond human scale.</b> {os.overloaded.slice(0, 3).map((c) => c.name).join(", ")}{os.overloaded.length > 3 ? "…" : ""} — split a cohort or bring in another instructor so their people stay genuinely known, not processed.
                </div>
              )}
            </section>
          )}

          {/* Who needs a person now — principle 6: route scarce care, don't automate it. */}
          {os.needsPerson.length > 0 && (
            <section className="mt-10">
              <h2 className="eyebrow mb-1">Who needs a person now</h2>
              <p className="mb-3 text-sm text-slate2">Slipping, and already known by someone — so this is a nudge to a <b>person</b>, not a campaign. Open anyone to see what they last worked on, and reach out yourself.</p>
              <div className="overflow-hidden rounded-2xl border border-line bg-white">
                {os.needsPerson.slice(0, 12).map((p, i) => (
                  <div key={p.userId} className={"flex items-center " + (i > 0 ? "border-t border-line" : "")}>
                    <div className="min-w-0 flex-1"><PersonLine p={p} note={p.carriedBy.length ? `${BUCKET_LABEL[p.bucket]} · carried by ${p.carriedBy[0].name}` : BUCKET_LABEL[p.bucket]} /></div>
                    <div className="pr-2"><ReachOut userId={p.userId} name={p.name} /></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Succession — principle 2: never let a tie be orphaned. */}
          {os.succession.length > 0 && (
            <section className="mt-10">
              <h2 className="eyebrow mb-1">Needs a human</h2>
              <p className="mb-3 text-sm text-slate2">A relationship should never fall to no one. Hand these off before the tie goes cold.</p>
              <div className="space-y-2">
                {os.succession.map((s, i) => (
                  <div key={i} className="rounded-2xl border border-amber/50 bg-amber-soft/40 p-4">
                    <div className="text-sm font-bold text-ink">{s.cohort} · {s.people} {s.people === 1 ? "person" : "people"}</div>
                    <p className="mt-0.5 text-xs text-slate2">{s.reason}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Peers helping peers — principle 7: the scale escape. */}
          {(os.helpfulPeers.length > 0 || os.unwelcomed.length > 0) && (
            <section className="mt-10">
              <h2 className="eyebrow mb-1">Peers helping peers</h2>
              <p className="mb-3 text-sm text-slate2">The most durable relationships aren&apos;t to you — they&apos;re to each other. A cohort that helps itself needs no one at the center.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {os.helpfulPeers.length > 0 && (
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <div className="text-sm font-bold text-ink">Already helping others</div>
                    <p className="mt-0.5 text-xs text-slate2">People who&apos;ve worked alongside the most peers. Thank them — genuinely. Maybe ask one to welcome someone new.</p>
                    <div className="mt-3 overflow-hidden rounded-xl border border-line">
                      {os.helpfulPeers.slice(0, 6).map((p, i) => <div key={p.userId} className={i > 0 ? "border-t border-line" : ""}><PersonLine p={p} note={`${p.peerDegree} peer${p.peerDegree === 1 ? "" : "s"}`} /></div>)}
                    </div>
                  </div>
                )}
                {os.unwelcomed.length > 0 && (
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <div className="text-sm font-bold text-ink">No peer yet</div>
                    <p className="mt-0.5 text-xs text-slate2">They&apos;ve shown up but no one&apos;s worked with them. Introduce them to one person — that&apos;s the tie that keeps them.</p>
                    <div className="mt-3 overflow-hidden rounded-xl border border-line">
                      {os.unwelcomed.slice(0, 6).map((p, i) => <div key={p.userId} className={i > 0 ? "border-t border-line" : ""}><PersonLine p={p} note="" /></div>)}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Broadcast — deliberately last and deliberately small (principle 8). */}
          <section className="mt-10 rounded-2xl border border-line bg-mist/40 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Broadcast — sparingly</div>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate2">
              A broadcast reaches everyone at once — the opposite of a personal note. It&apos;s right for a genuine announcement, wrong as a stand-in for care. If you can name the person and why, send a note instead.
            </p>
            <div className="mt-3"><PushComposer segments={segments} /></div>
          </section>
        </>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/facilitator/ask" className="btn-dark text-sm">Ask your cohort a question</Link>
        <Link href="/team/outcomes" className="btn-ghost text-sm">See outcomes →</Link>
      </div>
    </main>
  );
}
