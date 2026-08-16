import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, UNTAGGED } from "@/lib/admin";
import BenchmarkHistogram from "@/components/BenchmarkHistogram";

export const dynamic = "force-dynamic";

export default async function FacilitatorBenchmark({
  searchParams,
}: {
  searchParams: { cohort?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const cohort = searchParams.cohort || UNTAGGED;
  const label = cohort === UNTAGGED ? "(untagged)" : cohort;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/facilitator?cohort=${encodeURIComponent(cohort)}`}
          className="text-sm text-slate2 hover:text-ink"
        >
          ← {label}
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-ink">The Benchmark — live</h1>
        <p className="text-slate2">Scores update as the room submits. Project this.</p>
      </div>

      <div className="card p-8">
        <BenchmarkHistogram cohort={cohort} big />
      </div>
    </main>
  );
}
