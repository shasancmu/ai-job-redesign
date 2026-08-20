import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, UNTAGGED } from "@/lib/admin";
import NetworkRosterEditor from "@/components/NetworkRosterEditor";

export const dynamic = "force-dynamic";

export default async function EditRoster({
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

  let names: string[] = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("network_config")
      .select("roster")
      .eq("cohort", cohort)
      .maybeSingle();
    names = (data?.roster || []).map((r: any) => r.name);
  } catch {
    /* none yet */
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/facilitator/network?cohort=${encodeURIComponent(cohort)}`} className="text-sm text-slate2 hover:text-ink">← Back to the live network</Link>
        <HeaderNav />
      </div>
      <h1 className="mt-1 text-2xl font-bold text-ink">Class roster</h1>
      <p className="mb-6 text-slate2">
        Optional: paste your class list, one name per line, so people can find each other fast.
        You can also skip this: anyone not listed just adds their own name when they take the survey.
      </p>
      <NetworkRosterEditor cohort={cohort} initialNames={names} />
    </main>
  );
}
