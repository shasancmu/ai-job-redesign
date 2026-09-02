import RankDisclosuresReport from "@/components/RankDisclosuresReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "Disclosure ranking");
}

export default async function DisclosuresRankView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const ranked = canvas.ranked;
  return (
    <ReportShell
      code={code}
      eyebrow="Rank Our Disclosures"
      title="Disclosure portfolio"
      backLabel="← Back to the tool"
      shareTitle="A ranked disclosure portfolio"
      shareText="Here's a ranked disclosure portfolio from Superadditive + Scientifiq:"
      hasReport={Array.isArray(ranked) && ranked.length > 0}
      emptyText="This hasn't been ranked yet."
    >
      <RankDisclosuresReport ranked={ranked || []} read={canvas.read} />
    </ReportShell>
  );
}
