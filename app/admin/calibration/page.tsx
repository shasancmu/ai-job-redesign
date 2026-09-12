import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import { calibrationReport, type ModuleCalibration } from "@/lib/calibration";
import Logo from "@/components/Logo";
import CalibrationRater from "@/components/CalibrationRater";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · L2 calibration" };

function pct(x: number | null) { return x == null ? "—" : x.toFixed(2); }

function Row({ c }: { c: ModuleCalibration }) {
  const a = c.aiVsHuman;
  const band = a.verdict === "excellent" || a.verdict === "good" ? "text-sage" : a.verdict === "moderate" ? "text-amber-600" : "text-clay";
  return (
    <tr className="border-b border-line/60 last:border-0 align-top">
      <td className="px-3 py-2 text-ink">{c.label}</td>
      <td className="px-3 py-2 tabular-nums text-slate-500">{a.n}</td>
      <td className="px-3 py-2 tabular-nums text-ink">{pct(a.icc)}{a.iccLo != null && <span className="text-slate-400"> [{pct(a.iccLo)}, {pct(a.iccHi)}]</span>}</td>
      <td className={`px-3 py-2 font-semibold ${band}`}>{a.verdict}</td>
      <td className="px-3 py-2 tabular-nums text-slate-500">{pct(a.pearson)}</td>
      <td className="px-3 py-2 tabular-nums text-slate-500">{a.bias == null ? "—" : `${a.bias > 0 ? "+" : ""}${a.bias}`}</td>
      <td className="px-3 py-2 tabular-nums text-slate-500">{c.ceiling.icc == null ? "—" : `${pct(c.ceiling.icc)} (${c.ceiling.n})`}</td>
    </tr>
  );
}

export default async function CalibrationPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  const admin = createAdminClient();
  const { modules, overall, totalRatings } = await calibrationReport(admin);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <div className="mb-6">
        <Link href="/admin" className="text-xs text-slate-500 hover:underline">← Admin</Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">L2 calibration</h1>
        <p className="mt-1 text-sm text-slate2">Does the AI competence score agree with human experts? Raters score the same runs blind — no arm, no AI score — and this reports the agreement. ICC(2,1), absolute agreement; ceiling = how well the humans agree with each other (the AI can&apos;t be expected to beat it).</p>
      </div>

      {totalRatings === 0 ? (
        <div className="card mb-8 p-6 text-sm text-slate2">No human ratings yet. Score a few runs below — the report appears once the AI score and at least a couple of human ratings exist for the same runs.</div>
      ) : (
        <div className="card mb-8 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 font-semibold">Module</th>
                <th className="px-3 py-3 font-semibold">n</th>
                <th className="px-3 py-3 font-semibold">ICC (AI vs human)</th>
                <th className="px-3 py-3 font-semibold">Agreement</th>
                <th className="px-3 py-3 font-semibold">r</th>
                <th className="px-3 py-3 font-semibold">Bias</th>
                <th className="px-3 py-3 font-semibold">Human ceiling</th>
              </tr>
            </thead>
            <tbody>
              {overall && <tr className="bg-slate-50/60 font-semibold"><td className="px-3 py-2 text-ink">All modules</td><td className="px-3 py-2 tabular-nums">{overall.aiVsHuman.n}</td><td className="px-3 py-2 tabular-nums">{pct(overall.aiVsHuman.icc)}</td><td className="px-3 py-2">{overall.aiVsHuman.verdict}</td><td className="px-3 py-2 tabular-nums">{pct(overall.aiVsHuman.pearson)}</td><td className="px-3 py-2 tabular-nums">{overall.aiVsHuman.bias ?? "—"}</td><td className="px-3 py-2 tabular-nums">{overall.ceiling.icc == null ? "—" : pct(overall.ceiling.icc)}</td></tr>}
              {modules.map((c) => <Row key={c.module} c={c} />)}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-3">
        <h2 className="text-lg font-bold text-ink">Rate runs</h2>
        <p className="mt-1 text-sm text-slate2">Read the transcript and score the learner&apos;s competence 0–100 against the rubric. You won&apos;t see the AI&apos;s score or which arm the run was in.</p>
      </div>
      <CalibrationRater />
    </main>
  );
}
