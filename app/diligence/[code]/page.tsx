import DiligenceScienceReport from "@/components/DiligenceScienceReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";

export const dynamic = "force-dynamic";

export default async function DiligenceView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const read = canvas.read;
  return (
    <ReportShell
      code={code}
      eyebrow="Diligence the Science"
      title={canvas.title || "Science diligence"}
      backLabel="← Back to the tool"
      shareTitle="A science diligence read"
      shareText="Here's a science diligence read from Superadditive + Scientifiq:"
      hasReport={!!read}
      emptyText="This hasn't been run yet."
    >
      <DiligenceScienceReport read={read || {}} scores={canvas.scores} comparables={canvas.comparables || []} patents={canvas.patents || []} />
    </ReportShell>
  );
}
