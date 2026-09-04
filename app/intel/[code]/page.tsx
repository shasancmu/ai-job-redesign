import ScienceIntelResult from "@/components/ScienceIntelResult";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "Science Intelligence");
}

export default async function IntelView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const result = canvas.result;
  return (
    <ReportShell
      code={code}
      eyebrow="Science Intelligence"
      title="A read on the science frontier"
      backLabel="← Back to the console"
      shareTitle="My Science Intelligence report"
      shareText="A read on the science frontier from Superadditive:"
      hasReport={!!result}
      emptyText="No report has been run yet."
      openLabel="Open the console"
    >
      {result && <ScienceIntelResult mode={result.mode} data={result.data} narrate={result.narrate} />}
    </ReportShell>
  );
}
