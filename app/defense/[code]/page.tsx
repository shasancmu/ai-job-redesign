import { redirect } from "next/navigation";
import DefenseImpactReport from "@/components/DefenseImpactReport";
import ReportShell from "@/components/ReportShell";
import { loadOwnerReport } from "@/lib/reportPage";
import { createClient } from "@/lib/supabase/server";
import { isDirectorOrAdmin } from "@/lib/orgs";

export const dynamic = "force-dynamic";

export default async function DefenseView({ params }: { params: { code: string } }) {
  // Defense Impact is superadmin-only.
  const { data: { user } } = await createClient().auth.getUser();
  if (!user || !(await isDirectorOrAdmin(user))) redirect("/dashboard");
  const { code, canvas } = await loadOwnerReport(params.code);
  const read = canvas.read;
  return (
    <ReportShell
      code={code}
      eyebrow="Defense Impact"
      title={canvas.title || "Defense impact potential"}
      backLabel="← Back to the tool"
      shareTitle="A defense-impact estimate"
      shareText="Here's a defense-impact estimate from Superadditive + Scientifiq:"
      hasReport={!!read}
      emptyText="This hasn't been estimated yet."
    >
      <DefenseImpactReport read={read || {}} scores={canvas.scores} evidence={canvas.evidence} engine={canvas.engine} />
    </ReportShell>
  );
}
