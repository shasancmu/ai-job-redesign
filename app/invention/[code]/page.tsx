import ScoreInventionReport from "@/components/ScoreInventionReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "Invention score");
}

export default async function InventionView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const read = canvas.read;
  return (
    <ReportShell
      code={code}
      eyebrow="Score My Invention"
      title={canvas.title || "Invention potential"}
      backLabel="← Back to the tool"
      shareTitle="An invention potential score"
      shareText="Here's a potential score from Superadditive + Scientifiq:"
      hasReport={!!read}
      emptyText="This hasn't been scored yet."
    >
      <ScoreInventionReport read={read || {}} scores={canvas.scores} extra={canvas.extra} />
    </ReportShell>
  );
}
