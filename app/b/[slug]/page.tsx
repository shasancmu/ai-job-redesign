import Logo from "@/components/Logo";
import { getBenchConfig, publicBenchConfig } from "@/lib/mechanics/benchStore";
import BenchRunner from "@/components/BenchRunner";
import { prepareModuleRun } from "@/lib/moduleRun";
import ModuleNotFound from "@/components/ModuleNotFound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Name the tab after the authored module, not its slug. The loader is
// request-memoised, so this shares the page's query rather than adding one.
export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const spec = await getBenchConfig(params.slug);
    if (spec?.title) return { title: spec.title };
  } catch { /* fall through */ }
  return { title: "Quiz" };
}

export default async function RunBenchmark({ params }: { params: { slug: string } }) {
  const { localize } = await prepareModuleRun({ kindId: "benchmark", slug: params.slug });

  const cfg = await getBenchConfig(params.slug);
  if (!cfg) return <ModuleNotFound title="Quiz not found" hint="This quiz doesn't exist yet." />;
  const pub = { ...(await localize(publicBenchConfig(cfg))), slug: params.slug };
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-4"><Logo href="/dashboard" /></div>
      <BenchRunner cfg={pub} />
    </main>
  );
}
