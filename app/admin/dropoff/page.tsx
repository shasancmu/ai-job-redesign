import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { isSuperadmin } from "@/lib/orgs";
import { moduleDropoff } from "@/lib/moduleEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Admin · drop-off" };

export default async function DropoffPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  const rows = await moduleDropoff();
  const color = (c: number) => (c >= 70 ? "text-sage" : c >= 40 ? "text-amber" : "text-clay");

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <Logo href="/dashboard" />
        <Link href="/admin/orgs" className="text-sm text-slate2 hover:text-ink">Orgs →</Link>
      </div>
      <h1 className="mt-2 text-2xl font-bold text-ink">Module drop-off</h1>
      <p className="mb-6 text-sm text-slate2">Where learners leave, per module. Completion is distinct users who reached the report divided by distinct users who started. Superadmin only.</p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-slate-400">No runs recorded yet. Data appears as people start and finish modules (needs the module_events migration).</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5 font-semibold">Module</th>
                <th className="px-3 py-2.5 text-right font-semibold">Started</th>
                <th className="px-3 py-2.5 text-right font-semibold">Finished</th>
                <th className="px-4 py-2.5 text-right font-semibold">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.slug}>
                  <td className="px-4 py-2.5"><span className="font-mono text-xs text-ink">{r.slug}</span>{r.kind && <span className="ml-2 rounded-full bg-mist px-1.5 py-0.5 text-[10px] text-slate-500">{r.kind}</span>}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.starts}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{r.completes}</td>
                  <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${color(r.completion)}`}>{r.completion}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-400">A low completion with high starts is where to look first, especially on modules with a predict-then-reveal gate.</p>
    </main>
  );
}
