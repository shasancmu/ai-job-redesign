import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { facilitatorAccess } from "@/lib/orgs";
import HeaderNav from "@/components/HeaderNav";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { DEFAULT_CONFIG, coerceConfig, configReady } from "@/lib/benchmark";
import QuizManager from "@/components/QuizManager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Quiz" };

export default async function FacilitatorQuiz() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await facilitatorAccess(user)).ok) redirect("/dashboard");

  let ready = false;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("benchmark_config").select("data").eq("id", "default").maybeSingle();
    ready = configReady(coerceConfig(data?.data || DEFAULT_CONFIG));
  } catch {
    ready = false;
  }

  const { data: sessions } = await supabase
    .from("quiz_sessions")
    .select("id, code, status, created_at")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/facilitator" className="text-sm text-slate2 hover:text-ink">← Cohorts</Link>
          <HeaderNav />
        </div>
        <h1 className="mt-1 text-3xl text-ink">The Benchmark</h1>
        <p className="mt-1 text-slate2">
          A timed test the room takes from their phones (no sign-in), scored live, then set against the machine.
          Uses your shared question set.{" "}
          <Link href="/facilitator/benchmark" className="font-medium text-ink underline underline-offset-2">Run it for a cohort instead →</Link>
        </p>
      </div>

      {!ready && (
        <div className="mb-6 rounded-xl border border-amber/30 bg-amber-soft/50 p-4 text-sm text-ink">
          Your questions aren&apos;t set up yet.{" "}
          <Link href="/facilitator/benchmark/edit" className="font-semibold underline underline-offset-2">Edit questions</Link>{" "}
          first — takers will see a "not ready" screen until every question and option has text.
        </div>
      )}

      <QuizManager me={user.id} initial={(sessions as any) || []} ready={ready} />
    </main>
  );
}
