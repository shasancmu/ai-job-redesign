import ScienceRadarResult from "@/components/ScienceRadarResult";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "Science Radar");
}

export default async function RadarView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const result = canvas.result;
  return (
    <ReportShell
      code={code}
      eyebrow="Science Radar"
      title="Where's the science you could be using"
      backLabel="← Back to the radar"
      shareTitle="My Science Radar"
      shareText="The science frontier for my company, from Superadditive:"
      hasReport={!!result}
      emptyText="No radar has been run yet."
      openLabel="Open the radar"
    >
      {result && <ScienceRadarResult report={result.report} narrate={result.narrate} />}
    </ReportShell>
  );
}
