import CollaboratorsReport from "@/components/CollaboratorsReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";

export const dynamic = "force-dynamic";

export const metadata = { title: "Co-founder search" };

export default async function CofounderView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const report = canvas.report;
  return (
    <ReportShell
      code={code}
      eyebrow="Find a Technical Co-Founder"
      title="Technical co-founder candidates"
      backLabel="← Back to the tool"
      shareTitle="Technical co-founder candidates"
      shareText="Here are technical co-founder candidates, found via Superadditive + Scientifiq:"
      hasReport={!!report}
      emptyText="This hasn't been generated yet."
    >
      <CollaboratorsReport report={report || {}} scopeLabel={canvas.scopeLabel} />
    </ReportShell>
  );
}
