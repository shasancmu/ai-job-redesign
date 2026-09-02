import PersonalNetworkReport from "@/components/PersonalNetworkReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your network map" };

export default async function NetworkMapView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const report = canvas.report;
  return (
    <ReportShell
      code={code}
      eyebrow="Map Your Personal Network"
      title="Your network"
      backLabel="← Back to the map"
      shareTitle="A personal network map"
      shareText="Here's the read on my personal network, from Superadditive:"
      hasReport={!!report}
      emptyText="This hasn't been generated yet."
    >
      <PersonalNetworkReport
        report={report || {}}
        metrics={canvas.metrics}
        contacts={canvas.contacts || []}
        ties={canvas.ties || {}}
      />
    </ReportShell>
  );
}
