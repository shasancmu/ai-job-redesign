import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { getAnalyticalSpec, publicAnalyticalSpec } from "@/lib/mechanics/analyticalStore";
import AnalyticalRunner from "@/components/AnalyticalRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function RunAnalytical({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/x/${params.slug}`);
  const spec = await getAnalyticalSpec(params.slug);
  if (!spec) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo /><h1 className="mt-6 text-xl font-bold text-ink">Instrument not found</h1><p className="mt-2 text-sm text-slate2">This instrument doesn't exist yet.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center gap-3"><Logo href="/dashboard" /><span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{spec.emoji || "📊"} {spec.name} · preview</span></div>
      <AnalyticalRunner spec={publicAnalyticalSpec(spec)} />
    </main>
  );
}
