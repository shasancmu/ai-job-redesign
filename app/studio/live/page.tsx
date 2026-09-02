import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { facilitatorAccess } from "@/lib/orgs";
import { listLivePrompts } from "@/lib/mechanics/livePromptStore";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import LivePromptManager from "@/components/LivePromptManager";

export const dynamic = "force-dynamic";

// Author your own LIVE templates — the frontier of the template library: an
// instructor writes a live prompt the room answers, saved as a reusable module.
export const metadata = { title: "Live modules" };

export default async function StudioLive() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/studio/live");
  if (!(await facilitatorAccess(user)).ok) redirect("/dashboard");

  const prompts = await listLivePrompts(user.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/studio" className="text-sm text-slate2 hover:text-ink">← Studio</Link><HeaderNav /></div>
      </header>
      <span className="eyebrow text-sage">Live templates</span>
      <h1 className="mt-2 text-3xl font-bold text-ink">Author a live prompt</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate2">
        Write a question the room answers live from their phones — the answers aggregate on screen, then AI synthesizes them. It becomes a <b>Live</b> module in your library: assign it to a cohort, and launch it from the cohort&apos;s Run-live cockpit, alongside every other exercise.
      </p>
      <div className="mt-6">
        <LivePromptManager initial={(prompts as any) || []} />
      </div>
    </main>
  );
}
