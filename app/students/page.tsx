import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { instructorRoster } from "@/lib/cases/roster";
import { listMyLivingCases } from "@/lib/cases/store";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "My students" };

function fmt(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—";
}

export default async function StudentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/students");

  const myCases = await listMyLivingCases(user.id);
  const roster = await instructorRoster(user.id, myCases.map((c) => c.slug));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold text-ink">My students</h1>
        <Link href="/cases/mine" className="text-sm font-medium text-ai hover:underline">My cases →</Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">Everyone who's joined a class you run — across every term. Students who return to a second class are your growing relationship capital.</p>

      {roster.totalStudents === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-mist/30 p-10 text-center">
          <div className="text-3xl">👥</div>
          <p className="mt-2 font-serif text-lg text-ink">No students yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">When students join a class you own (via its join code), they'll show up here — and you'll see who comes back term after term.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat n={roster.totalStudents} label="Students" />
            <Stat n={roster.returning} label="Returning" sub="in 2+ of your classes" />
            <Stat n={myCases.length} label="Your cases" />
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line bg-mist/50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-semibold">Student</th>
                  <th className="px-3 py-2 font-semibold">Classes</th>
                  <th className="px-3 py-2 text-right font-semibold">Cases opened</th>
                  <th className="px-3 py-2 font-semibold">Since</th>
                </tr>
              </thead>
              <tbody>
                {roster.students.map((s) => (
                  <tr key={s.userId} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2">
                      <span className="font-medium text-ink">{s.name}</span>
                      {s.returning && <span className="ml-2 rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-medium text-sage">returning</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate2">{s.classCount} · {s.classNames.slice(0, 2).join(", ")}{s.classNames.length > 2 ? "…" : ""}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate2">{s.casesEngaged}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">{fmt(s.firstJoined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

function Stat({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="text-2xl font-bold tabular-nums text-ink">{n}</div>
      <div className="text-xs text-slate-500">{label}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}
