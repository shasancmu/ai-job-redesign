import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg, masterCohortCode } from "@/lib/orgs";
import CapstoneLobby from "@/components/CapstoneLobby";

export const dynamic = "force-dynamic";

// The team lobby for The Number. A signed-in student either starts a team (and
// gets a team code to share) or joins one. The cohort/org code is auto-assigned
// from their sign-in so the run rolls up to their cohort.
export const metadata = { title: "Capstone" };

export default async function CapstoneLobbyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/capstone");

  const activeOrg = await getActiveOrg(user);
  const cohort = activeOrg ? masterCohortCode(activeOrg.id) : "";

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const myName = (profile?.display_name as string) || (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "";

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <div className="mb-6"><Logo href="/dashboard" /></div>
      <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Team capstone</div>
      <h1 className="mt-1 text-3xl font-bold text-ink">The Number</h1>
      <p className="mt-1 text-sm text-slate2">Four to a team. One of you starts a team, the other three join with the code.</p>
      <CapstoneLobby userId={user.id} myName={myName} cohort={cohort} orgName={activeOrg?.name || ""} />
    </main>
  );
}
