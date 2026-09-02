import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { recordModuleEvent } from "@/lib/moduleEvents";
import { getNewsSpec, publicNewsSpec } from "@/lib/mechanics/newsStore";
import NewsFrameRunner from "@/components/NewsFrameRunner";
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/nf/${params.slug}`);
  await recordModuleEvent(params.slug, "newsframe", "start", user.id);
  const spec = await getNewsSpec(params.slug);
  if (!spec) return <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center"><Logo /><h1 className="mt-6 text-xl font-bold text-ink">Not found</h1></main>;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center gap-3"><Logo href="/dashboard" /><span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{spec.emoji || "🗞️"} {spec.name} · preview</span></div>
      <NewsFrameRunner spec={publicNewsSpec(spec)} />
    </main>
  );
}
