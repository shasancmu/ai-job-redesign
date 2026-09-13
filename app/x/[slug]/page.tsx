import Logo from "@/components/Logo";
import { getAnalyticalSpec, publicAnalyticalSpec } from "@/lib/mechanics/analyticalStore";
import AnalyticalRunner from "@/components/AnalyticalRunner";
import { prepareModuleRun } from "@/lib/moduleRun";
import ModuleNotFound from "@/components/ModuleNotFound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Exercise" };

export default async function RunAnalytical({ params }: { params: { slug: string } }) {
  const { localize } = await prepareModuleRun({ kindId: "analytical", slug: params.slug });
  const spec = await getAnalyticalSpec(params.slug);
  if (!spec) return <ModuleNotFound title="Instrument not found" hint="This instrument doesn't exist yet." />;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center gap-3"><Logo href="/dashboard" /><span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{spec.emoji || "📊"} {spec.name} · preview</span></div>
      <AnalyticalRunner spec={await localize(publicAnalyticalSpec(spec))} />
    </main>
  );
}
