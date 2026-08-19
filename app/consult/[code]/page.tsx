import ConsultReport from "@/components/ConsultReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";

export const dynamic = "force-dynamic";

export default async function ConsultView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const report = canvas.report;
  return (
    <ReportShell
      code={code}
      eyebrow="The 30-Minute Consult"
      title={canvas.intake?.name || "Your business"}
      backLabel="← Back to the consult"
      shareTitle="A business consult"
      shareText="Here's my 30-Minute Consult from Superadditive:"
      hasReport={!!report}
      emptyText="This consult hasn't been built yet."
      openLabel="Open the consult"
    >
      <ConsultReport report={report} wms={canvas.wmsScore} />
    </ReportShell>
  );
}
