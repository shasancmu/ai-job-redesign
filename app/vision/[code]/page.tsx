import { loadOwnerReport } from "@/lib/reportPage";
import ReportShell from "@/components/ReportShell";
import VisionReport from "@/components/VisionReport";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your vision" };

export default async function VisionReportPage({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const report = canvas.report;
  const org = canvas.intake?.name;

  return (
    <ReportShell
      code={code}
      eyebrow="Company vision"
      title={org ? `${org} — vision` : "Your vision"}
      backLabel="← Back to the room"
      shareTitle={org ? `${org} — vision` : "Our vision"}
      shareText="Read our vision"
      hasReport={!!report}
      emptyText="This vision hasn't been built yet."
      openLabel="Go back and build it"
    >
      <VisionReport report={report} org={org} />
    </ReportShell>
  );
}
