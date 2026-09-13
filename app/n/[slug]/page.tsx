import Logo from "@/components/Logo";
import { getNegScenario, publicNegScenario } from "@/lib/mechanics/negStore";
import NegRunner from "@/components/NegRunner";
import { prepareModuleRun } from "@/lib/moduleRun";
import ModuleNotFound from "@/components/ModuleNotFound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Run/preview an authored negotiation. Only the client-safe scenario is sent;
// the counterpart's payoff table stays on the server.
// Name the tab after the authored module, not its slug. The loader is
// request-memoised, so this shares the page's query rather than adding one.
export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const spec = await getNegScenario(params.slug);
    if (spec?.name) return { title: spec.name };
  } catch { /* fall through */ }
  return { title: "Negotiation" };
}

export default async function RunNegotiation({ params }: { params: { slug: string } }) {
  const { localize } = await prepareModuleRun({ kindId: "negotiation", slug: params.slug });

  const scn = await getNegScenario(params.slug);
  if (!scn) return <ModuleNotFound title="Negotiation not found" hint="This scenario doesn't exist yet." />;
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center gap-3">
        <Logo href="/dashboard" />
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">🤝 {(scn as any).name} · preview</span>
      </div>
      <NegRunner scn={await localize(publicNegScenario(scn))} />
    </main>
  );
}
