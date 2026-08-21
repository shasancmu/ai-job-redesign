import Link from "next/link";
import { loadOwnerReport } from "@/lib/reportPage";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import ShareReport from "@/components/ShareReport";
import VisionReport from "@/components/VisionReport";

export const dynamic = "force-dynamic";

export default async function VisionReportPage({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const report = canvas.report;
  const org = canvas.intake?.name;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div>
          <Logo href="/dashboard" />
          <h1 className="mt-3 text-3xl text-ink">{org ? `${org} — vision` : "Your vision"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {report && <ShareReport code={code} title={org ? `${org} — vision` : "Our vision"} text="Read our vision" />}
          <Link href="/dashboard" className="btn-ghost text-sm">← Dashboard</Link>
        </div>
      </header>

      {report ? (
        <VisionReport report={report} org={org} />
      ) : (
        <div className="card p-8 text-center text-slate-600">
          This vision hasn&apos;t been built yet. <Link href={`/room/${code}`} className="text-sage underline">Go back and build it</Link>.
        </div>
      )}

      <div className="mt-10"><Footer /></div>
    </main>
  );
}
