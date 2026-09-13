import Logo from "@/components/Logo";
import { getExplainerSpec } from "@/lib/mechanics/explainerStore";
import ExplainerRunner from "@/components/ExplainerRunner";
import { prepareModuleRun } from "@/lib/moduleRun";
import ModuleNotFound from "@/components/ModuleNotFound";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Name the tab after the authored module, not its slug. The loader is
// request-memoised, so this shares the page's query rather than adding one.
export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const spec = await getExplainerSpec(params.slug);
    if (spec?.name) return { title: spec.name };
  } catch { /* fall through */ }
  return { title: "Explainer" };
}

export default async function RunExplainer({ params }: { params: { slug: string } }) {
  const { localize } = await prepareModuleRun({ kindId: "explainer", slug: params.slug, recordStart: false });
  const spec = await getExplainerSpec(params.slug);
  if (!spec) return <ModuleNotFound title="Explainer not found" />;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center gap-3"><Logo href="/dashboard" /><span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{spec.emoji || "📖"} {spec.name}</span></div>
      <ExplainerRunner spec={await localize(spec)} />
    </main>
  );
}
