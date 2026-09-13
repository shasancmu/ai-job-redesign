import Logo from "@/components/Logo";
import { getNewsSpec, publicNewsSpec } from "@/lib/mechanics/newsStore";
import NewsFrameRunner from "@/components/NewsFrameRunner";
import { prepareModuleRun } from "@/lib/moduleRun";
import ModuleNotFound from "@/components/ModuleNotFound";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Name the tab after the authored module, not its slug. The loader is
// request-memoised, so this shares the page's query rather than adding one.
export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const spec = await getNewsSpec(params.slug);
    if (spec?.name) return { title: spec.name };
  } catch { /* fall through */ }
  return { title: "News frame" };
}

export default async function RunNews({ params }: { params: { slug: string } }) {
  const { localize } = await prepareModuleRun({ kindId: "newsframe", slug: params.slug });
  const spec = await getNewsSpec(params.slug);
  if (!spec) return <ModuleNotFound title="Not found" />;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center gap-3"><Logo href="/dashboard" /><span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{spec.emoji || "🗞️"} {spec.name} · preview</span></div>
      <NewsFrameRunner spec={await localize(publicNewsSpec(spec))} />
    </main>
  );
}
