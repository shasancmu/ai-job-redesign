import PaperStudyReport from "@/components/PaperStudyReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "Paper study");
}

export default async function PaperStudyView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const study = canvas.study;
  return (
    <ReportShell
      code={code}
      eyebrow="Paper deconstruction"
      title={study?.title || "Understand a Paper"}
      backLabel="← Back to the exercise"
      shareTitle="A paper deconstruction"
      shareText="Here's how I broke down this paper with Superadditive:"
      hasReport={!!study}
      emptyText="This hasn't been generated yet."
    >
      <PaperStudyReport study={study} />
    </ReportShell>
  );
}
