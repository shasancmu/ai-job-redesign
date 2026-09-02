import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgBySlug } from "@/lib/orgs";
import { getClassUnitBySlug } from "@/lib/classUnits";
import { authoredRunHref } from "@/lib/moduleCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function NotFound({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <Logo />
      <h1 className="mt-6 text-xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-slate2">{body}</p>
      <Link href="/dashboard" className="btn-ghost mt-6">Go to dashboard</Link>
    </main>
  );
}

// The hierarchical launch: /ORG/CLASS/COHORT/MODULE. Validates the whole chain,
// enrolls the learner in the cohort, then forwards to the module's runner with
// the cohort attached (so the run is scoped to it). Flat URLs still work.
export const metadata = { title: "Class exercise" };

export default async function HierarchicalRun({ params }: { params: { code: string; klass: string; cohort: string; mod: string } }) {
  const orgSlug = params.code.toLowerCase();
  const classSlug = params.klass.toLowerCase();
  const cohortCode = params.cohort.toUpperCase();
  const moduleSlug = params.mod;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/${orgSlug}/${classSlug}/${cohortCode}/${moduleSlug}`);

  const org = await getOrgBySlug(orgSlug);
  if (!org) return <NotFound title="School not found" body="That first part of the link doesn't match a school here." />;
  const cu = await getClassUnitBySlug(org.id, classSlug);
  if (!cu) return <NotFound title="Class not found" body={`No class "${classSlug}" in ${org.name}.`} />;

  const admin = createAdminClient();
  const { data: cohort } = await admin.from("classes").select("id, org_id, class_unit_id, modules").eq("code", cohortCode).maybeSingle();
  if (!cohort || (cohort as any).org_id !== org.id || (cohort as any).class_unit_id !== cu.id) {
    return <NotFound title="Cohort not found" body="That cohort doesn't belong to this class." />;
  }

  const available = new Set([...(((cohort as any).modules as string[]) || []), ...cu.modules]);
  if (!available.has(moduleSlug)) {
    return <NotFound title="Module not in this cohort" body="That module isn't assigned to this cohort or its class." />;
  }

  // The link both joins the cohort and launches the module.
  await admin.from("class_members").upsert({ class_id: (cohort as any).id, user_id: user.id }, { onConflict: "class_id,user_id", ignoreDuplicates: true });

  // Resolve the module to its runner: the newer authored engines (negotiation,
  // quiz, analytical, news, explainer, redesign) go to their own runner; role-
  // plays to /m; everything else (custom interviews, library modules) to /start.
  const authored = await authoredRunHref(moduleSlug, cohortCode);
  if (authored) redirect(authored);

  let isRoleplay = false;
  try {
    const { data: rp } = await admin.from("module_specs").select("slug").eq("slug", moduleSlug).eq("status", "published").limit(1).maybeSingle();
    isRoleplay = !!rp;
  } catch { /* table missing -> treat as non-roleplay */ }

  redirect(isRoleplay ? `/m/${moduleSlug}?class=${encodeURIComponent(cohortCode)}` : `/start/${moduleSlug}?cohort=${encodeURIComponent(cohortCode)}`);
}
