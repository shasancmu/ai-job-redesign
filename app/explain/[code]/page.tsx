import ExplainReport from "@/components/ExplainReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "Explainer");
}

export default async function ExplainView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const read = canvas.read;
  return (
    <ReportShell
      code={code}
      eyebrow="ExplainAI"
      title={canvas.title || "In plain language"}
      backLabel="← Back to the tool"
      shareTitle="Research, in plain language"
      shareText="Here's a plain-language translation from Superadditive + Scientifiq:"
      hasReport={!!read}
      emptyText="This hasn't been translated yet."
    >
      <ExplainReport read={read || {}} />
    </ReportShell>
  );
}
