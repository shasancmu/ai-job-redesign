import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moduleBySlug } from "@/lib/modules";
import { getActiveOrg, ensureMasterCohort } from "@/lib/orgs";
import PairUp from "@/components/PairUp";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pair up" };

export default async function PairPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { cohort?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/pair/${params.slug}`);

  const mod = moduleBySlug(params.slug);
  if (!mod || (mod.exercise !== "job" && mod.exercise !== "workflow")) {
    redirect("/dashboard");
  }

  // Tag the session with a cohort so it rolls up for the facilitator. An explicit
  // ?cohort= wins; otherwise default to the member's active-org general cohort, so
  // an org's runs group under that org without needing a special link.
  let cohort = searchParams.cohort || "";
  if (!cohort) {
    const org = await getActiveOrg(user);
    if (org) cohort = (await ensureMasterCohort(org)) || "";
  }

  return (
    <PairUp
      userId={user.id}
      moduleName={mod.name}
      exercise={mod.exercise}
      cohort={cohort}
    />
  );
}
