import CollaboratorsReport from "@/components/CollaboratorsReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "Your collaborators");
}

export default async function CollaboratorsView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const report = canvas.report;
  return (
    <ReportShell
      code={code}
      eyebrow="Find Collaborators"
      title="Complementary collaborators"
      backLabel="← Back to the tool"
      shareTitle="Complementary collaborators"
      shareText="Here are complementary collaborators, found via Superadditive + Scientifiq:"
      hasReport={!!report}
      emptyText="This hasn't been generated yet."
    >
      <CollaboratorsReport report={report || {}} scopeLabel={canvas.scopeLabel} />
    </ReportShell>
  );
}
