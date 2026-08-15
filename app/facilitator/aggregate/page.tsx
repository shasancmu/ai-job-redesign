import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, UNTAGGED } from "@/lib/admin";
import AggregateView from "@/components/AggregateView";

export const dynamic = "force-dynamic";

export default async function AggregatePage({
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
  return <AggregateView cohort={cohort} />;
}
