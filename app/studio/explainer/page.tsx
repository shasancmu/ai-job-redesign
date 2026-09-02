import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Explainers" };

export default async function ExplainerStudio() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");
  const { data: mine } = await supabase.from("explainer_specs").select("slug, spec, status, updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(50);
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between"><Logo href="/dashboard" /><div className="flex items-center gap-2"><Link href="/studio" className="text-sm text-slate2 hover:text-ink">← Studio</Link><HeaderNav /></div></header>
      <h1 className="text-3xl text-ink">Explainers</h1>
      <p className="mt-1 max-w-2xl text-slate2">A taught, guided walkthrough of a topic, section by section. The clearest way to hand learners a concept, built from your materials.</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/studio/explainer/start" className="btn-primary inline-block">+ New explainer</Link>
        <Link href="/studio/explainer/new" className="text-sm text-slate2 underline hover:text-ink">Or start from a blank one</Link>
      </div>
      {(mine || []).length > 0 && (
        <div className="mt-8"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your explainers</div><div className="mt-2 space-y-2">
          {(mine || []).map((m: any) => (<div key={m.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white p-3"><div><span className="font-semibold text-ink">{m.spec?.emoji || "📖"} {m.spec?.name || m.slug}</span><span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate-500">{m.status}</span></div><div className="flex items-center gap-2"><Link href={`/studio/explainer/${m.slug}`} className="btn-ghost text-sm">Edit</Link><Link href={`/e/${m.slug}`} className="btn-ghost text-sm">Preview →</Link></div></div>))}
        </div></div>
      )}
    </main>
  );
}
