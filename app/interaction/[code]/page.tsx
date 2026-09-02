import InteractionReport from "@/components/InteractionReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { DEFAULT_IDEA } from "@/lib/interaction";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your interaction" };

export default async function InteractionView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const idea = { ...DEFAULT_IDEA, ...(canvas.idea || {}) };
  const result = canvas.result;
  return (
    <ReportShell
      code={code}
      eyebrow="The Anatomy of an Idea"
      title="Your idea"
      backLabel="← Back to the exercise"
      shareTitle="A research idea"
      shareText="Here's my research idea, worked through with Superadditive:"
      hasReport={!!result}
      emptyText="This hasn't been generated yet."
    >
      {result && <InteractionReport inputs={idea} idea={result} />}
    </ReportShell>
  );
}
