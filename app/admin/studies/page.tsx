import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/orgs";
import { studyImpact, type Study, type StudyCohort, type StudyResult } from "@/lib/studies";
import Logo from "@/components/Logo";
import StudiesAdmin from "@/components/StudiesAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · studies" };

export default async function StudiesAdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isSuperadmin(user))) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: studyRows } = await admin.from("studies").select("*").order("created_at", { ascending: false });
  const studies = (studyRows || []) as Study[];
  const { data: cohortRows } = await admin.from("study_cohorts").select("*");
  const cohorts = (cohortRows || []) as StudyCohort[];

  // Live cohort-level analysis for anything past draft.
  const results: Record<string, StudyResult | null> = {};
  await Promise.all(studies.filter((s) => s.status !== "draft").map(async (s) => { results[s.id] = await studyImpact(admin, s.id); }));

  const cohortsByStudy: Record<string, StudyCohort[]> = {};
  for (const c of cohorts) (cohortsByStudy[c.study_id] ||= []).push(c);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <div className="mb-6">
        <Link href="/admin" className="text-xs text-slate-500 hover:underline">← Admin</Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">Studies</h1>
        <p className="mt-1 text-sm text-slate2">Cohort-level field experiments. A study freezes how cohorts map to conditions or waves, so the effect on L2 competence is identified by design. Assigning cohorts is the moment of randomization — it&apos;s logged as the pre-registration record.</p>
      </div>

      <StudiesAdmin studies={studies} cohortsByStudy={cohortsByStudy} results={results} />
    </main>
  );
}
