import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { facilitatorAccess } from "@/lib/orgs";
import { isAdmin, UNTAGGED } from "@/lib/admin";
import { PHASES } from "@/lib/exercise";
import Cockpit from "@/components/Cockpit";

export const dynamic = "force-dynamic";

export const metadata = { title: "Live activities" };

export default async function LivePage({
  searchParams,
}: {
  searchParams: { cohort?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await facilitatorAccess(user)).ok) redirect("/dashboard");

  const cohort = searchParams.cohort || UNTAGGED;
  const stepLabels = PHASES.map((p) => p.title);

  return <Cockpit cohort={cohort} stepLabels={stepLabels} />;
}
