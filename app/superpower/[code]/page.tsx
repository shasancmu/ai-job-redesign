import SuperpowerReport from "@/components/SuperpowerReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";

export const dynamic = "force-dynamic";

export default async function SuperpowerView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const report = canvas.report;
  return (
    <ReportShell
      code={code}
      eyebrow="Find Your Superpower"
      title="Your superpower"
      backLabel="← Back to the interview"
      shareTitle="A superpower profile"
      shareText="Here's my Superpower profile from Superadditive:"
      hasReport={!!report}
      emptyText="This hasn't been generated yet."
    >
      <SuperpowerReport report={report} />
    </ReportShell>
  );
}
