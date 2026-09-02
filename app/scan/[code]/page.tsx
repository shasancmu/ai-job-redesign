import DomainInsightReport from "@/components/DomainInsightReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";

export const dynamic = "force-dynamic";

// Shared artifact page for the four landscape scans; the eyebrow/title come
// from what the room saved.
export const metadata = { title: "Technology scan" };

export default async function ScanView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const read = canvas.read;
  return (
    <ReportShell
      code={code}
      eyebrow={canvas.eyebrow || "Domain scan"}
      title={canvas.title || "Scan"}
      backLabel="← Back to the tool"
      shareTitle="A Scientifiq domain scan"
      shareText="Here's a domain scan from Superadditive + Scientifiq:"
      hasReport={!!read}
      emptyText="This hasn't been run yet."
    >
      <DomainInsightReport read={read || {}} data={canvas.data} />
    </ReportShell>
  );
}
