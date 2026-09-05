import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { caseBySlug } from "@/lib/cases/registry";
import { isSuperadmin } from "@/lib/orgs";
import { caseInsights } from "@/lib/cases/events";
import AssignLink from "@/components/AssignLink";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Case insights" };

function timeAgo(s: string) {
  const d = Date.now() - new Date(s).getTime();
  const h = Math.floor(d / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function CaseInsightsPage({ params, searchParams }: { params: { slug: string }; searchParams: { c?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/cases/${params.slug}/insights`);

  // Author-gated: the case's author, or a superadmin for built-in cases.
  const builtin = caseBySlug(params.slug);
  let name = builtin?.title || params.slug;
  let canView = false;
  if (builtin) canView = await isSuperadmin(user);
  else {
    const admin = createAdminClient();
    const { data: row } = await admin.from("custom_modules").select("author_id, name").eq("slug", params.slug).eq("super_type", "living-case").maybeSingle();
    canView = !!row && (row as any).author_id === user.id;
    name = (row as any)?.name || name;
  }
  if (!canView) redirect("/dashboard");

  const cohort = searchParams.c || null;
  const ins = await caseInsights(params.slug, cohort);
  const pct = Math.round(ins.completionRate * 100);
  const maxDec = Math.max(1, ...ins.decisions.map((d) => d.n));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Case insights{cohort ? ` · class ${cohort}` : ""}</div>
          <h1 className="mt-1 font-serif text-2xl font-bold text-ink">{name}</h1>
        </div>
        <Link href={`/cases/${params.slug}`} className="text-sm font-medium text-ai hover:underline">Open the case →</Link>
      </div>

      {/* cohort filter */}
      {ins.cohorts.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400">Class:</span>
          <Link href={`/cases/${params.slug}/insights`} className={"rounded-full px-2.5 py-1 " + (!cohort ? "bg-ink text-white" : "bg-mist text-slate2")}>All</Link>
          {ins.cohorts.map((c) => (
            <Link key={c} href={`/cases/${params.slug}/insights?c=${c}`} className={"rounded-full px-2.5 py-1 " + (cohort === c ? "bg-ink text-white" : "bg-mist text-slate2")}>{c}</Link>
          ))}
        </div>
      )}

      {/* headline numbers */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat n={ins.readers} label="Opened it" />
        <Stat n={ins.completed} label="Made the call" />
        <Stat n={`${pct}%`} label="Completion" />
        <Stat n={ins.questions.length} label="Questions asked" />
      </div>

      {ins.readers === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-mist/30 p-8 text-center text-sm text-slate-500">
          No engagement yet. Copy the assignment link below and share it with your class — reads, decisions, clicks, and questions will show up here.
        </div>
      )}

      {/* assignment link */}
      <div className="mt-6"><AssignLink slug={params.slug} /></div>

      {/* decisions */}
      {ins.decisions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">What the class decided</h2>
          <div className="mt-3 space-y-2">
            {ins.decisions.map((d, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm"><span className="text-ink">{d.label}</span><span className="tabular-nums text-slate-400">{d.n}</span></div>
                <div className="mt-0.5 h-2 rounded-full bg-mist"><div className="h-2 rounded-full bg-sage" style={{ width: `${(d.n / maxDec) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* clicked links */}
      {ins.links.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Links they clicked</h2>
          <div className="mt-3 space-y-1.5">
            {ins.links.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-line/60 pb-1.5 text-sm">
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sky underline">{l.url}</a>
                <span className="shrink-0 tabular-nums text-slate-400">{l.n} click{l.n === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* questions asked */}
      {ins.questions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">What they asked the tutor</h2>
          <div className="mt-3 space-y-1.5">
            {ins.questions.map((q, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-1.5">
                <span className="min-w-0 flex-1 text-sm text-ink">“{q.q}”</span>
                <span className="shrink-0 text-xs text-slate-400">{timeAgo(q.when)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="text-2xl font-bold tabular-nums text-ink">{n}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
