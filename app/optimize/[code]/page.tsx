import ImpactOptimizerReport from "@/components/ImpactOptimizerReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";

export const dynamic = "force-dynamic";

export const metadata = { title: "Impact optimizer" };

export default async function OptimizeView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const result = canvas.result;
  return (
    <ReportShell
      code={code}
      eyebrow="Impact Optimizer"
      title="The missing science"
      backLabel="← Back to the tool"
      shareTitle="What would raise this work's impact"
      shareText="Here's the missing science, ranked by predicted impact, from Superadditive + Scientifiq:"
      hasReport={!!result}
      emptyText="This hasn't been optimized yet."
    >
      {result ? <ImpactOptimizerReport result={result} /> : null}
    </ReportShell>
  );
}
