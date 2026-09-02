import ScoreInventionReport from "@/components/ScoreInventionReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your positioning" };

export default async function PositionView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const read = canvas.read;
  return (
    <ReportShell
      code={code}
      eyebrow="Position My Research"
      title={canvas.title || "Research positioning"}
      backLabel="← Back to the tool"
      shareTitle="A research positioning read"
      shareText="Here's a positioning read from Superadditive + Scientifiq:"
      hasReport={!!read}
      emptyText="This hasn't been scored yet."
    >
      <ScoreInventionReport read={read || {}} scores={canvas.scores} />
    </ReportShell>
  );
}
