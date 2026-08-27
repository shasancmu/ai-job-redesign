import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { getNegScenario, publicNegScenario } from "@/lib/mechanics/negStore";
import NegRunner from "@/components/NegRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Run/preview an authored negotiation. Only the client-safe scenario is sent;
// the counterpart's payoff table stays on the server.
export default async function RunNegotiation({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/n/${params.slug}`);

  const scn = await getNegScenario(params.slug);
  if (!scn) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo />
        <h1 className="mt-6 text-xl font-bold text-ink">Negotiation not found</h1>
        <p className="mt-2 text-sm text-slate2">This scenario doesn't exist yet.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center gap-3">
        <Logo href="/dashboard" />
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">🤝 {(scn as any).name} · preview</span>
      </div>
      <NegRunner scn={publicNegScenario(scn)} />
    </main>
  );
}
