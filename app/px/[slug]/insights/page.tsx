import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import { paperxInsights } from "@/lib/paperx/insights";

export const dynamic = "force-dynamic";
export const metadata = { title: "Explainer insights" };

function timeAgo(s: string) {
  const d = Date.now() - new Date(s).getTime();
  const h = Math.floor(d / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="text-2xl font-bold tabular-nums text-ink">{n}</div>
      <div className="mt-0.5 text-xs text-slate-400">{label}</div>
    </div>
  );
}

export default async function PaperxInsightsPage({ params, searchParams }: { params: { slug: string }; searchParams: { c?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/px/${params.slug}/insights`);

  const cohort = searchParams.c || null;
  const ins = await paperxInsights(params.slug, user.id, cohort);
  if (!ins.isAuthor) redirect("/dashboard");

  const maxBucket = Math.max(1, ...ins.scoreBuckets.map((b) => b.n));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between"><Logo href="/dashboard" /><HeaderNav /></header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Explainer insights{cohort ? ` · class ${cohort}` : ""}</div>
          <h1 className="mt-1 text-2xl font-bold text-ink">{ins.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/studio/paper/${params.slug}`} className="text-sm text-slate2 hover:text-ink">Edit</Link>
          <Link href={`/px/${params.slug}`} className="text-sm font-medium text-ai hover:underline">Open →</Link>
        </div>
      </div>

      {/* cohort filter */}
      {ins.cohorts.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400">Class:</span>
          <Link href={`/px/${params.slug}/insights`} className={"rounded-full px-2.5 py-1 " + (!cohort ? "bg-ink text-white" : "bg-mist text-slate2")}>All</Link>
          {ins.cohorts.map((c) => (
            <Link key={c} href={`/px/${params.slug}/insights?c=${c}`} className={"rounded-full px-2.5 py-1 " + (cohort === c ? "bg-ink text-white" : "bg-mist text-slate2")}>{c}</Link>
          ))}
        </div>
      )}

      {/* headline numbers */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat n={ins.completed} label="Completed the teach-back" />
        <Stat n={ins.avgScore === null ? "—" : ins.avgScore} label="Avg teach-back score" />
        <Stat n={ins.perCohort.length} label="Classes assigned" />
      </div>

      {ins.completed === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-6 text-center text-sm text-slate-500">
          No completions yet. Assign this explainer to a class (in the class module picker), and completions and teach-back scores will show up here.
        </div>
      ) : (
        <>
          {/* score distribution */}
          {ins.scoreBuckets.length > 0 && (
            <section className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Teach-back scores</div>
              <div className="mt-2 space-y-2">
                {ins.scoreBuckets.map((b) => (
                  <div key={b.label} className="flex items-center gap-3">
                    <div className="w-16 shrink-0 text-xs tabular-nums text-slate-500">{b.label}</div>
                    <div className="h-5 flex-1 overflow-hidden rounded-full bg-mist">
                      <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${(b.n / maxBucket) * 100}%`, minWidth: b.n ? 8 : 0 }} />
                    </div>
                    <div className="w-8 shrink-0 text-right text-xs tabular-nums text-slate-500">{b.n}</div>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400">How clearly learners could explain the idea, graded 0–100 (best score per learner).</p>
            </section>
          )}

          {/* per-cohort breakdown */}
          {ins.perCohort.length > 0 && (
            <section className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">By class</div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[440px] text-sm">
                  <thead><tr className="text-left text-xs text-slate-400"><th className="py-1.5 pr-3 font-medium">Class</th><th className="px-3 font-medium">Completed</th><th className="px-3 font-medium">Enrolled</th><th className="px-3 font-medium">Rate</th><th className="px-3 font-medium">Avg score</th></tr></thead>
                  <tbody>
                    {ins.perCohort.map((c) => (
                      <tr key={c.cohort} className="border-t border-line">
                        <td className="py-2 pr-3 font-medium text-ink">{c.name} <span className="text-xs text-slate-400">{c.cohort}</span></td>
                        <td className="px-3 tabular-nums text-ink">{c.completed}</td>
                        <td className="px-3 tabular-nums text-slate-500">{c.enrolled || "—"}</td>
                        <td className="px-3 tabular-nums text-slate-600">{c.enrolled ? `${Math.round(c.completionRate * 100)}%` : "—"}</td>
                        <td className="px-3 tabular-nums text-slate-600">{c.avgScore === null ? "—" : c.avgScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* recent completions */}
          {ins.recent.length > 0 && (
            <section className="mt-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent completions</div>
              <div className="mt-2 space-y-2">
                {ins.recent.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
                    <div className="shrink-0 text-sm font-bold tabular-nums" style={{ color: r.score === null ? "#94a3b8" : r.score >= 75 ? "#3F7A52" : r.score >= 50 ? "#B07A1E" : "#C0603A" }}>{r.score === null ? "—" : r.score}</div>
                    <div className="min-w-0 flex-1"><div className="text-sm text-slate-600">{r.verdict || "Completed the teach-back."}</div><div className="text-xs text-slate-400">{timeAgo(r.when)}</div></div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
