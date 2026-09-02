import EarningsReport from "@/components/EarningsReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "The earnings call");
}

export default async function EarningsView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const report = canvas.report;
  return (
    <ReportShell
      code={code}
      eyebrow="The Earnings Call"
      title="Your interrogation"
      backLabel="← Back to the call"
      shareTitle="My earnings-call interrogation"
      shareText="Here's how I read a quarter on Superadditive:"
      hasReport={!!report}
      emptyText="This call hasn't been graded yet."
      openLabel="Open the call"
    >
      <EarningsReport report={report} verdict={canvas.verdict} />
    </ReportShell>
  );
}
