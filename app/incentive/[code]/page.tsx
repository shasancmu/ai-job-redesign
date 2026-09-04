import IncentiveResult from "@/components/IncentiveResult";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "The Incentive Lab");
}

export default async function IncentiveView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const result = canvas.result;
  return (
    <ReportShell
      code={code}
      eyebrow="The Incentive Lab"
      title="How your incentive got gamed"
      backLabel="← Back to the lab"
      shareTitle="My incentive design got gamed"
      shareText="I designed a reward system and AI workers found every loophole:"
      hasReport={!!result}
      emptyText="No tournament has been run yet."
      openLabel="Open the lab"
    >
      {result && canvas.scenario && <IncentiveResult result={result} scenario={canvas.scenario} par={canvas.par} />}
    </ReportShell>
  );
}
