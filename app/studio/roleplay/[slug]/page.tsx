import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";
import { getSpec } from "@/lib/mechanics/store";
import { getInsights, listResultCohorts } from "@/lib/mechanics/insights";
import { currentTier } from "@/lib/mechanics/promotion";
import { BLANK, seedFromTemplate } from "@/lib/mechanics/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import SpecEditor from "@/components/SpecEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditRoleplay({ params, searchParams }: { params: { slug: string }; searchParams: { from?: string; cohort?: string; remix?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0)) redirect("/dashboard");

  const isNew = params.slug === "new";
  let spec: any;
  if (isNew && searchParams.remix) {
    // Fork: seed a fresh draft from a published module, keep a lineage crumb.
    const src = await getSpec(searchParams.remix);
    spec = src
      ? { ...src, slug: "", meta: { ...(src.meta || {}), name: `${src.meta?.name || "Module"} (remix)` }, lineage: { forkedFrom: searchParams.remix, forkedFromName: src.meta?.name || searchParams.remix } }
      : BLANK;
  } else if (isNew) {
    spec = searchParams.from ? seedFromTemplate(searchParams.from) : BLANK;
  } else {
    spec = (await getSpec(params.slug)) || BLANK;
  }
  const cohort = searchParams.cohort || null;
  const statusOf = async (): Promise<any> => {
    try { const { data } = await createAdminClient().from("module_specs").select("status").eq("slug", params.slug).eq("owner_id", user.id).order("version", { ascending: false }).limit(1).maybeSingle(); return data; }
    catch { return null; }
  };
  const [insights, cohorts, statusRow, tier] = isNew
    ? [null, [] as string[], null, "personal" as const]
    : await Promise.all([getInsights(params.slug, cohort), listResultCohorts(params.slug), statusOf(), currentTier("roleplay", params.slug)]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/studio/roleplay" className="text-sm text-slate2 hover:text-ink">← Modules</Link><HeaderNav /></div>
      </header>
      <h1 className="text-2xl font-bold text-ink">{isNew ? "New role-play module" : `Edit: ${(spec as any).meta?.name || params.slug}`}</h1>
      <SpecEditor me={user.id} initial={spec} insights={insights} initialStatus={(statusRow as any)?.status} cohorts={cohorts as string[]} cohort={cohort || undefined} tier={tier as string} />
    </main>
  );
}
