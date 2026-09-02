import HotSeatReport from "@/components/HotSeatReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";

export const dynamic = "force-dynamic";

export const metadata = { title: "The hot seat" };

export default async function HotSeatView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const report = canvas.report;
  return (
    <ReportShell
      code={code}
      eyebrow="The Hot Seat"
      title="How you handled the call"
      backLabel="← Back to the call"
      shareTitle="My turn in the hot seat"
      shareText="Here's how I handled a hostile earnings call on Superadditive:"
      hasReport={!!report}
      emptyText="This call hasn't been graded yet."
      openLabel="Open the call"
    >
      <HotSeatReport report={report} />
    </ReportShell>
  );
}
