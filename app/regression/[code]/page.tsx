import RegressionResult from "@/components/RegressionResult";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "Regression Detective");
}

export default async function RegressionView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const result = canvas.result;
  return (
    <ReportShell
      code={code}
      eyebrow="Regression Detective"
      title="Your model vs. the truth"
      backLabel="← Back to the console"
      shareTitle="My Regression Detective result"
      shareText="I tried to recover a hidden data-generating process on Superadditive:"
      hasReport={!!result}
      emptyText="This challenge hasn't been submitted yet."
      openLabel="Open the console"
    >
      {result && <RegressionResult grade={result.grade} feedback={result.feedback} context={canvas.challenge?.context} />}
    </ReportShell>
  );
}
