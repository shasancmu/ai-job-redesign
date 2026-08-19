import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import ExperimentsBoard from "@/components/ExperimentsBoard";

export const dynamic = "force-dynamic";

export default async function ExperimentsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Facilitator</div>
          <h1 className="mt-1 text-3xl text-ink">Experiments</h1>
        </div>
        <Link href="/facilitator" className="btn-ghost text-sm">← Facilitator</Link>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-slate2">
        The agent proposes subtle A/B tests on your AI interviews. You launch the ones you like. The statistics are computed in code and only call a winner once each arm hits the required sample size, so nothing is decided on a hunch. You decide what to adopt.
      </p>
      <ExperimentsBoard />
    </main>
  );
}
