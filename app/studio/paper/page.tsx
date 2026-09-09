import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import PaperxAuthor from "@/components/PaperxAuthor";
import { listMyPaperx } from "@/lib/paperx/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paper Explainer" };

export default async function StudioPaperPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/studio/paper");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");

  const mine = await listMyPaperx(user.id).catch(() => []);

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between"><Logo href="/dashboard" /><div className="flex items-center gap-2"><Link href="/studio" className="text-sm text-slate2 hover:text-ink">← Studio</Link><HeaderNav /></div></header>
      <div className="text-4xl" aria-hidden>💡</div>
      <h1 className="mt-2 text-3xl font-bold text-ink">Paper Explainer</h1>
      <p className="mt-2 max-w-xl text-slate2">Turn an academic paper into an interactive, visual explainer. A reader walks through the puzzle, the evidence, and the core idea, then has to explain it back in their own words. The goal: they understand it deeply enough to teach it to someone else.</p>

      <div className="mt-6"><PaperxAuthor /></div>

      {mine.length > 0 && (
        <div className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your explainers</div>
          <div className="mt-2 space-y-2">
            {mine.map((m) => (
              <div key={m.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white p-3">
                <div><span className="font-semibold text-ink">{m.name || m.slug}</span><span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate-500">{m.status}</span></div>
                <div className="flex items-center gap-2">
                  <Link href={`/studio/paper/${m.slug}`} className="btn-ghost text-sm">Edit</Link>
                  <Link href={`/px/${m.slug}`} className="btn-ghost text-sm">Open →</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
