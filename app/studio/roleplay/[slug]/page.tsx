import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { isAdmin } from "@/lib/admin";
import { getSpec } from "@/lib/mechanics/store";
import { getInsights, listResultCohorts } from "@/lib/mechanics/insights";
import { BLANK, seedFromTemplate } from "@/lib/mechanics/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import SpecEditor from "@/components/SpecEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditRoleplay({ params, searchParams }: { params: { slug: string }; searchParams: { from?: string; cohort?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const isNew = params.slug === "new";
  const spec = isNew
    ? (searchParams.from ? seedFromTemplate(searchParams.from) : BLANK)
    : (await getSpec(params.slug)) || BLANK;
  const cohort = searchParams.cohort || null;
  const statusOf = async (): Promise<any> => {
    try { const { data } = await createAdminClient().from("module_specs").select("status").eq("slug", params.slug).eq("owner_id", user.id).order("version", { ascending: false }).limit(1).maybeSingle(); return data; }
    catch { return null; }
  };
  const [insights, cohorts, statusRow] = isNew
    ? [null, [] as string[], null]
    : await Promise.all([getInsights(params.slug, cohort), listResultCohorts(params.slug), statusOf()]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/studio/roleplay" className="text-sm text-slate2 hover:text-ink">← Modules</Link><HeaderNav /></div>
      </header>
      <h1 className="text-2xl font-bold text-ink">{isNew ? "New role-play module" : `Edit: ${(spec as any).meta?.name || params.slug}`}</h1>
      <SpecEditor me={user.id} initial={spec} insights={insights} initialStatus={(statusRow as any)?.status} cohorts={cohorts as string[]} cohort={cohort || undefined} />
    </main>
  );
}
