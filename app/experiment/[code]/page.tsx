import ExperimentReport from "@/components/ExperimentReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { DEFAULT_CANVAS, dgpFromAI, seedFromCode, simulate, type ExperimentCanvas } from "@/lib/experiment";

export const dynamic = "force-dynamic";

// The saved artifact: the canvas plus a reproduced in-silico run (same seed as
// the room, at the AI's estimated sample and effect).
export const metadata = { title: "Your experiment" };

export default async function ExperimentView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const exp: ExperimentCanvas = { ...DEFAULT_CANVAS, ...(canvas.exp || {}) };
  const design = canvas.design;
  const dgp = design?.dgp ? dgpFromAI(design.dgp) : null;
  const result = dgp ? simulate(dgp, seedFromCode(code)) : null;
  return (
    <ReportShell
      code={code}
      eyebrow="The Strategy Experiment"
      title="Your experiment, in silico"
      backLabel="← Back to the exercise"
      shareTitle="A strategy field experiment"
      shareText="Here's my strategy experiment, designed and simulated with Superadditive:"
      hasReport={!!result}
      emptyText="This experiment hasn't been simulated yet."
    >
      {result && dgp && <ExperimentReport canvas={exp} design={design} dgp={dgp} result={result} />}
    </ReportShell>
  );
}
