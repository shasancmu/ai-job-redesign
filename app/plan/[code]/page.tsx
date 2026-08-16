import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlanView from "@/components/PlanView";

export const dynamic = "force-dynamic";

export default async function PlanPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (!session) redirect("/dashboard");

  const { data: ws } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("session_id", session.id)
    .eq("author_id", user.id)
    .maybeSingle();

  const plan = ws?.plan as any;
  const hasPlan = plan && (plan.headline || (plan.human?.length || 0) + (plan.ai?.length || 0) > 0);

  if (!hasPlan) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-ink">No plan yet</h1>
        <p className="mt-2 text-slate2">
          Head back to the exercise and tap <b>Build implementation plan</b> to generate it.
        </p>
        <Link href={`/room/${code}`} className="btn-primary mt-6">
          ← Back to the exercise
        </Link>
      </main>
    );
  }

  return <PlanView plan={plan} />;
}
