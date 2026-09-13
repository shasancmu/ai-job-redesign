import { getSpec, publicSpec } from "@/lib/mechanics/store";
import { prepareModuleRun } from "@/lib/moduleRun";
import ModuleNotFound from "@/components/ModuleNotFound";
import RoleplaySpecRoom from "@/components/RoleplaySpecRoom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Run/preview any role-play module by slug. Only the client-safe view of the spec
// is sent; scenarios and answer keys stay on the server.
// Name the tab after the authored module, not its slug. The loader is
// request-memoised, so this shares the page's query rather than adding one.
export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const spec = await getSpec(params.slug);
    if (spec?.meta?.name) return { title: spec.meta.name };
  } catch { /* fall through */ }
  return { title: "Role play" };
}

export default async function RunModule({ params, searchParams }: { params: { slug: string }; searchParams: { class?: string; cohort?: string } }) {
  const { cohort, localize } = await prepareModuleRun({ kindId: "roleplay", slug: params.slug, searchParams });

  const spec = await getSpec(params.slug);
  if (!spec || spec.mechanic !== "roleplay") {
    return <ModuleNotFound title="Module not found" hint="This module doesn't exist or isn't a role-play module yet." />;
  }
  return <RoleplaySpecRoom spec={await localize(publicSpec(spec))} cohort={cohort || undefined} />;
}
