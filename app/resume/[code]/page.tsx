import ResumeReport from "@/components/ResumeReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "Your résumé review");
}

export default async function ResumeView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const report = canvas.report;
  return (
    <ReportShell
      code={code}
      eyebrow="Refresh Your Résumé"
      title="Your changes"
      backLabel="← Back to the interview"
      shareTitle="Résumé changes"
      shareText="Here are the changes to make to my résumé, from Superadditive:"
      hasReport={!!report}
    >
      <ResumeReport report={report} />
    </ReportShell>
  );
}
