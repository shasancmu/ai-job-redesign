import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyLivingCases } from "@/lib/cases/store";
import { teachingRecord } from "@/lib/cases/events";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "My living cases" };

function RecStat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="text-2xl font-bold tabular-nums text-ink">{n}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function fmt(s?: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
}

export default async function MyCasesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cases/mine");
  const cases = await listMyLivingCases(user.id);
  const record = await teachingRecord(cases.map((c) => ({ slug: c.slug, name: c.name })));
  const stat = new Map(record.perCase.map((p) => [p.slug, p]));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold text-ink">My living cases</h1>
        <div className="flex items-center gap-3">
          <Link href="/students" className="text-sm font-medium text-ai hover:underline">My students →</Link>
          <Link href="/studio/upload" className="btn-primary text-sm">+ New case</Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500">Interactive case studies you've authored. Publish one, then share its link with a class.</p>

      {record.totals.readers > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <RecStat n={record.totals.readers} label="Students opened" />
          <RecStat n={record.totals.completed} label="Made a call" />
          <RecStat n={record.totals.cohorts} label="Classes reached" />
          <RecStat n={record.totals.cases} label="Cases" />
        </div>
      )}

      {cases.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-mist/30 p-10 text-center">
          <div className="text-3xl">🎬</div>
          <p className="mt-2 font-serif text-lg text-ink">No living cases yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Upload teaching materials or paste links in the studio, pick “Living Case,” and the studio drafts an interactive case you can publish.</p>
          <Link href="/studio/upload" className="btn-primary mt-4 inline-block text-sm">Author a case →</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {cases.map((c) => (
            <div key={c.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">{c.name || c.slug}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className={"rounded-full px-2 py-0.5 " + (c.status === "published" ? "bg-sage-soft text-sage" : "bg-amber-soft text-amber")}>{c.status}</span>
                  <span>updated {fmt(c.updated_at)}</span>
                  {(stat.get(c.slug)?.readers ?? 0) > 0 && <span className="text-slate2">· {stat.get(c.slug)!.readers} opened · {stat.get(c.slug)!.completed} decided</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link href={`/cases/${c.slug}`} className="font-medium text-ai hover:underline">Open →</Link>
                <Link href={`/cases/${c.slug}/insights`} className="text-slate2 hover:text-ink">Insights</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
