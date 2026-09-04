import NearestExpertResult from "@/components/NearestExpertResult";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "Nearest Expert");
}

export default async function NearestView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const result = canvas.result;
  return (
    <ReportShell
      code={code}
      eyebrow="Nearest Expert"
      title="Experts who can help, nearest first"
      backLabel="← Back to the search"
      shareTitle="Experts for my problem"
      shareText="The researchers who could help with my problem, nearest first:"
      hasReport={!!result}
      emptyText="No search has been run yet."
      openLabel="Open the search"
    >
      {result && <NearestExpertResult plan={result.plan} ladder={result.ladder} />}
    </ReportShell>
  );
}
