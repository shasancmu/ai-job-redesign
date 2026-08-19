import MyopiaReport from "@/components/MyopiaReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";

export const dynamic = "force-dynamic";

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
