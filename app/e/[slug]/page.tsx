import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { getExplainerSpec } from "@/lib/mechanics/explainerStore";
import ExplainerRunner from "@/components/ExplainerRunner";
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/e/${params.slug}`);
  const spec = await getExplainerSpec(params.slug);
  if (!spec) return <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center"><Logo /><h1 className="mt-6 text-xl font-bold text-ink">Explainer not found</h1></main>;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center gap-3"><Logo href="/dashboard" /><span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{spec.emoji || "📖"} {spec.name}</span></div>
      <ExplainerRunner spec={spec} />
    </main>
  );
}
