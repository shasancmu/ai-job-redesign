import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import { facilitatorAccess, getMyOrgs, getActiveOrg } from "@/lib/orgs";
import ClassManager from "@/components/ClassManager";
import Tour from "@/components/Tour";
import { listRoleplayCatalog } from "@/lib/mechanics/store";

export const dynamic = "force-dynamic";

const COHORT_TOUR = [
  { sel: '[data-tour="cohort-basics"]', title: "Name it and get its link", body: "Give the cohort a name and a short join code. That code becomes its shareable link — anyone who opens it joins this group." },
  { sel: '[data-tour="cohort-type"]', title: "Open class or invite-only", body: "A teaching class is open-join; an enterprise cohort only lets the email addresses you list join. Pick what fits your program." },
  { sel: '[data-tour="cohort-modules"]', title: "Choose the exercises, in order", body: "Add the modules participants will work through, and set the order with the arrows. Everyone in the cohort gets these unlocked." },
  { sel: '[data-tour="cohort-list"]', title: "Share and track", body: "Once saved, copy the link to share, then open View results to watch the room's work roll up as they go." },
];

export default async function Classes() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await facilitatorAccess(user)).ok) redirect("/dashboard");

  const [myOrgs, activeOrg, roleplayModules] = await Promise.all([getMyOrgs(user.id), getActiveOrg(user), listRoleplayCatalog()]);
  const staffOrgs = myOrgs.filter((m) => m.role !== "member").map((m) => ({ id: m.org.id, name: m.org.name }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/facilitator" className="text-sm text-slate2 hover:text-ink">← Cohorts</Link>
        <HeaderNav tour />
      </div>
      <h1 className="mt-1 text-2xl font-bold text-ink">Cohorts</h1>
      <p className="mb-6 text-slate2">
        Create a cohort, choose its modules, and share the link. Everyone who joins is grouped
        together, and their results roll up under one place.
      </p>
      <ClassManager orgs={staffOrgs} defaultOrgId={activeOrg?.id || ""} roleplayModules={roleplayModules} />
      <Tour
        steps={COHORT_TOUR}
        storageKey="tour-cohort-v1"
        welcomeTitle="Create your first cohort"
        welcomeBody="A cohort is a group going through a program together. Here's how to set one up in under a minute."
      />
    </main>
  );
}
