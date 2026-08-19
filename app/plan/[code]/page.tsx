import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import PlanView from "@/components/PlanView";

export const dynamic = "force-dynamic";

export default async function PlanPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Facilitators can view any participant's plan (via the admin client so RLS
  // doesn't hide a session they aren't a member of).
  const admin = isAdmin(user.email);
  let db: any = supabase;
  if (admin) {
    try {
      db = createAdminClient();
    } catch {
      /* no service role — fall back to the user client */
    }
  }

  const { data: session } = await db
    .from("sessions")
    .select("id, host_id")
    .eq("code", code)
    .maybeSingle();
  if (!session) redirect("/dashboard");

  // Your own plan when you're a participant; the host's plan when you're an admin.
  const authorId = admin ? session.host_id : user.id;
  const { data: ws } = await db
    .from("workspaces")
    .select("plan")
    .eq("session_id", session.id)
    .eq("author_id", authorId)
    .maybeSingle();

  const plan = ws?.plan as any;
  const hasPlan =
    plan &&
    (plan.headline || plan.summary || (plan.human?.length || 0) + (plan.ai?.length || 0) > 0);

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

  return <PlanView plan={plan} code={code} />;
}
