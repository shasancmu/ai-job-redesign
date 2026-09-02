import PipelineReport from "@/components/PipelineReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { DEFAULT_INPUTS } from "@/lib/pipeline";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "Publication pipeline");
}

export default async function PipelineView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const result = canvas.result;
  const inputs = { ...DEFAULT_INPUTS, ...(canvas.inputs || {}) };
  return (
    <ReportShell
      code={code}
      eyebrow="Publication Pipeline"
      title="Your publication pipeline"
      backLabel="← Back to the simulation"
      shareTitle="A publication pipeline plan"
      shareText="Here's my publication pipeline plan from Superadditive:"
      hasReport={!!result}
      emptyText="This hasn't been generated yet."
    >
      {result && <PipelineReport inputs={inputs} result={result} advice={canvas.advice} />}
    </ReportShell>
  );
}
