import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { getBenchConfig, publicBenchConfig } from "@/lib/mechanics/benchStore";
import BenchRunner from "@/components/BenchRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function RunBenchmark({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/b/${params.slug}`);

  const cfg = await getBenchConfig(params.slug);
  if (!cfg) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo />
        <h1 className="mt-6 text-xl font-bold text-ink">Benchmark not found</h1>
        <p className="mt-2 text-sm text-slate2">This benchmark doesn't exist yet.</p>
      </main>
    );
  }
  const pub = { ...publicBenchConfig(cfg), slug: params.slug };
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-4"><Logo href="/dashboard" /></div>
      <BenchRunner cfg={pub} />
    </main>
  );
}
