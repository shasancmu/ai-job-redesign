import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SIMS } from "@/lib/ailab/sims";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI Skills Lab" };

const ICON: Record<string, string> = { prompt: "✍️", agent: "🤖", vibe: "🎨" };

export default async function LabIndex() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/lab");

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">AI Skills Lab</h1>
        <p className="mt-1 text-sm text-slate2">Practice the skills that separate good AI work from bad, against a real model. Each lab ends with something you can use on your real tools the same day.</p>
      </div>
      <div className="space-y-3">
        {SIMS.map((s) => (
          <Link key={s.slug} href={`/lab/${s.slug}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-ai/40 hover:shadow-sm">
            <span className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>{ICON[s.kind]}</span>
              <span>
                <span className="block text-sm font-bold text-ink">{s.name}</span>
                <span className="block text-xs text-slate-500">{s.tagline}</span>
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-ai">Start →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
