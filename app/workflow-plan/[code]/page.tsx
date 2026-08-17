import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkflowPlanView from "@/components/WorkflowPlanView";

export const dynamic = "force-dynamic";

export default async function WorkflowPlanPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("id, host_id, guest_id")
    .eq("code", code)
    .maybeSingle();
  if (!session) redirect("/dashboard");
  if (session.host_id !== user.id && session.guest_id !== user.id) redirect("/dashboard");

  const { data: doc } = await supabase
    .from("workflow_docs")
    .select("*")
    .eq("session_id", session.id)
    .maybeSingle();

  const analysis = (doc?.analysis as any) || {};
  const hasContent =
    doc &&
    ((doc.steps?.length || 0) > 0 ||
      analysis.summary ||
      (analysis.opportunities?.length || 0) > 0 ||
      analysis.tradeoffs);

  if (!hasContent) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-ink">No plan yet</h1>
        <p className="mt-2 text-slate2">
          Head back to the workflow and run <b>Analyze with AI</b> to generate your redesign.
        </p>
        <Link href={`/room/${code}`} className="btn-primary mt-6">
          ← Back to the exercise
        </Link>
      </main>
    );
  }

  return <WorkflowPlanView doc={doc} code={code} />;
}
