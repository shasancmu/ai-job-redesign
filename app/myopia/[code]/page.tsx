import MyopiaReport from "@/components/MyopiaReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { reportTitle } from "@/lib/reportTitle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return reportTitle(params.code, "Your blind spots");
}

export default async function MyopiaView({ params }: { params: { code: string } }) {
  const { code, session, canvas } = await loadOwnerReport(params.code);
  const domain = session.exercise === "myopia-career" ? "career" : "business";
  const report = canvas.report;
  return (
    <ReportShell
      code={code}
      eyebrow={domain === "career" ? "Your career's blind spots" : "Your business's blind spots"}
      title="Overcoming myopia"
      shareTitle={`${domain === "career" ? "Career" : "Business"} blind spots`}
      shareText="Here are the blind spots I found, from Superadditive:"
      hasReport={!!report}
    >
      <MyopiaReport report={report} subjectWord={domain} />
    </ReportShell>
  );
}
