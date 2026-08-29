import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor, getActiveOrg } from "@/lib/orgs";
import { gatherOrgOutcomes } from "@/lib/orgOutcomes";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";

export const dynamic = "force-dynamic";

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="text-3xl font-bold text-ink tabular-nums">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate2">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

// The director outcomes report: an org-scoped proof surface. Private to the org's
// directors (and the superadmin managing it).
export default async function OutcomesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/team/outcomes");

  const role = await roleFor(user);
  const directorOrgs = role.memberships.filter((m) => m.role === "director").map((m) => m.org);
  const active = await getActiveOrg(user).catch(() => null);
  let org = directorOrgs.find((o) => active && o.id === active.id) || directorOrgs[0];
  if (!org && role.superadmin && active) org = active;
  if (!org) redirect(role.superadmin ? "/admin/orgs" : "/dashboard");

  const admin = createAdminClient();
  const o = await gatherOrgOutcomes(admin, org);
  const engaged = o.learners > 0 ? Math.round((o.active / o.learners) * 100) : 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/team" className="text-sm text-slate2 hover:text-ink">← Team</Link><HeaderNav /></div>
      </header>

      <span className="eyebrow text-sage">Outcomes</span>
      <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">{org.name}</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate2">
        What your people have done on Superadditive — participation, completion, and how their judgment held up. Private to you; a snapshot you can bring to a review.
      </p>

      {/* Headline stats */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={o.learners.toLocaleString()} label="Learners" hint="enrolled in your cohorts" />
        <Stat value={`${engaged}%`} label="Engaged" hint={`${o.active.toLocaleString()} ran an exercise`} />
        <Stat value={o.runs.toLocaleString()} label="Exercises run" />
        <Stat value={o.completionPct == null ? "—" : `${o.completionPct}%`} label="Completion" hint={o.completionPct == null ? "no data yet" : `${o.completes}/${o.starts} finished`} />
      </div>

      {/* Judgment / calibration */}
      {o.calibration && (
        <section className="mt-8 rounded-2xl border border-line bg-mist/40 p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">Judgment</div>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
            Across {o.calibration.answered.toLocaleString()} scored attempts, your learners&apos; confidence <b>{o.calibration.verdict}</b>
            {o.calibration.gap !== 0 && <> (avg gap {o.calibration.gap > 0 ? "+" : ""}{o.calibration.gap} pts)</>}.
          </p>
          <p className="mt-1 text-xs text-slate-400">Calibration = how well stated confidence matched actual accuracy — the thing most training never measures.</p>
        </section>
      )}

      {/* Most-run exercises */}
      {o.topExercises.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow mb-3">Most-run exercises</h2>
          <div className="space-y-2">
            {o.topExercises.map((e) => (
              <div key={e.name} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                <span className="text-xl">{e.emoji}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{e.name}</span>
                <span className="shrink-0 text-sm font-semibold text-slate2 tabular-nums">{e.count.toLocaleString()} run{e.count === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cohort breakdown */}
      {o.cohorts.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow mb-3">By cohort</h2>
          <div className="overflow-hidden rounded-2xl border border-line">
            <div className="flex items-center gap-3 bg-mist/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <span className="min-w-0 flex-1">Cohort</span>
              <span className="w-16 text-right">Learners</span>
              <span className="w-16 text-right">Active</span>
              <span className="w-14 text-right">Runs</span>
            </div>
            {o.cohorts.map((c, i) => (
              <div key={c.code} className={"flex items-center gap-3 px-4 py-3 text-sm " + (i > 0 ? "border-t border-line" : "")}>
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{c.name}</span>
                <span className="w-16 text-right tabular-nums text-slate2">{c.learners.toLocaleString()}</span>
                <span className="w-16 text-right tabular-nums text-slate2">{c.active.toLocaleString()}</span>
                <span className="w-14 text-right tabular-nums font-semibold text-ink">{c.runs.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {o.learners === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-6 text-center text-sm text-slate2">
          No learners in your cohorts yet. Once people join and run exercises, their outcomes roll up here.
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/facilitator/ask" className="btn-dark text-sm">Ask your cohort a question</Link>
        <Link href="/team" className="btn-ghost text-sm">Manage people →</Link>
      </div>
    </main>
  );
}
