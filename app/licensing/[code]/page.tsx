import LicensingBriefReport from "@/components/LicensingBriefReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";

export const dynamic = "force-dynamic";

export const metadata = { title: "Licensing brief" };

export default async function LicensingView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const brief = canvas.brief;
  return (
    <ReportShell
      code={code}
      eyebrow="Licensing Brief"
      title={canvas.title || "Licensing brief"}
      backLabel="← Back to the tool"
      shareTitle="A licensing brief"
      shareText="Here's a licensing brief from Superadditive + Scientifiq:"
      hasReport={!!brief}
      emptyText="This brief hasn't been generated yet."
    >
      <LicensingBriefReport
        brief={brief || {}}
        scores={canvas.scores}
        comparables={canvas.comparables || []}
        patents={canvas.patents || []}
        title={canvas.title}
      />
    </ReportShell>
  );
}
