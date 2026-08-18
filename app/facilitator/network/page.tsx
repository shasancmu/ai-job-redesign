import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, UNTAGGED } from "@/lib/admin";
import NetworkGraph from "@/components/NetworkGraph";
import NetworkDescribe from "@/components/NetworkDescribe";

export const dynamic = "force-dynamic";

export default async function FacilitatorNetwork({
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
        <Link href={`/facilitator?cohort=${encodeURIComponent(cohort)}`} className="text-sm text-slate2 hover:text-ink">
          ← {label}
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-ink">The Network: live</h1>
          <div className="flex items-center gap-2">
            <a href={`/api/network/export?cohort=${encodeURIComponent(cohort)}`} className="btn-ghost text-sm">
              ↓ CSV
            </a>
            <Link href={`/facilitator/network/edit?cohort=${encodeURIComponent(cohort)}`} className="btn-ghost text-sm">
              Edit roster
            </Link>
          </div>
        </div>
        <p className="text-slate2">The graph redraws as people respond. Names stay hidden on the plot. Project this.</p>
      </div>

      <div className="card p-6">
        <NetworkGraph cohort={cohort} big />
      </div>

      <div className="mt-5">
        <NetworkDescribe cohort={cohort} />
      </div>
    </main>
  );
}
