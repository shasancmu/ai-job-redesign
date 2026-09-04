import StarHireResult from "@/components/StarHireResult";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "Star Hire");
}

export default async function StarHireView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const result = canvas.result;
  return (
    <ReportShell
      code={code}
      eyebrow="Star Hire"
      title="Your hire vs. the truth"
      backLabel="← Back to the interviews"
      shareTitle="My Star Hire decision"
      shareText="I made a hire on Superadditive and found out how portable each candidate really was:"
      hasReport={!!result}
      emptyText="This hire hasn't been submitted yet."
      openLabel="Open the room"
    >
      {result && canvas.scenario && <StarHireResult result={result} scenario={canvas.scenario} />}
    </ReportShell>
  );
}
