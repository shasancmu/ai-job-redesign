import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import { facilitatorAccess, getActiveOrg } from "@/lib/orgs";
import { listAssignableRoleplay } from "@/lib/mechanics/store";
import { listAssignableInterviewModules } from "@/lib/customModules";
import ClassUnitsManager from "@/components/ClassUnitsManager";
import { listAuthoredModules } from "@/lib/moduleCatalog";

export const dynamic = "force-dynamic";

// The CLASS tier: school/company > CLASS (dept/course) > COHORT (section).
export default async function ClassesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await facilitatorAccess(user)).ok) redirect("/dashboard");

  const [activeOrg, interviewModules, authoredModules] = await Promise.all([getActiveOrg(user), listAssignableInterviewModules(user.id), listAuthoredModules()]);
  const roleplayModules = await listAssignableRoleplay(user.id, activeOrg?.id || null);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/facilitator" className="text-sm text-slate2 hover:text-ink">← Cohorts</Link>
        <HeaderNav />
      </div>
      <h1 className="mt-1 text-2xl font-bold text-ink">Classes</h1>
      <p className="mb-2 text-slate2">
        A class is a department or course under {activeOrg?.name || "your school"}. It owns a set of modules that
        every cohort (section or session) under it inherits, so you set the exercises once and reuse them.
      </p>
      <p className="mb-2 text-xs text-slate-400">School or company &rsaquo; <b className="text-slate-500">Class</b> (here) &rsaquo; Cohort (a section or session).</p>
      {activeOrg?.slug && <p className="mb-6 rounded-lg bg-mist/60 px-3 py-2 font-mono text-xs text-slate-500">Launch link pattern: superadditive.app/<b className="text-slate-700">{activeOrg.slug}</b>/<b className="text-slate-700">class</b>/<b className="text-slate-700">COHORT</b>/<b className="text-slate-700">module</b></p>}
      <ClassUnitsManager roleplayModules={roleplayModules} interviewModules={interviewModules} authoredModules={authoredModules} orgName={activeOrg?.name || null} />
    </main>
  );
}
