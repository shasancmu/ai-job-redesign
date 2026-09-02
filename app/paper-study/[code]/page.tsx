import PaperStudyReport from "@/components/PaperStudyReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";

export const dynamic = "force-dynamic";

export const metadata = { title: "Paper study" };

export default async function PaperStudyView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const study = canvas.study;
  return (
    <ReportShell
      code={code}
      eyebrow="Understand a Paper"
      title="Paper deconstruction"
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
