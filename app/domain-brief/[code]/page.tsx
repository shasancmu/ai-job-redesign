import DomainBriefReport from "@/components/DomainBriefReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";

export const dynamic = "force-dynamic";

export const metadata = { title: "Domain brief" };

export default async function DomainBriefView({ params }: { params: { code: string } }) {
  const { code, canvas } = await loadOwnerReport(params.code);
  const brief = canvas.brief;
  const data = canvas.data;
  return (
    <ReportShell
      code={code}
      eyebrow="Domain Expertise Brief"
      title={data?.domain ? `${data.domain} · ${data.scopeLabel}` : "Domain expertise"}
      backLabel="← Back to the tool"
      shareTitle="A domain expertise brief"
      shareText="Here's a research-intelligence brief from Superadditive + Scientifiq:"
      hasReport={!!(brief && data)}
      emptyText="This brief hasn't been generated yet."
    >
      <DomainBriefReport brief={brief || {}} data={data || {}} />
    </ReportShell>
  );
}
