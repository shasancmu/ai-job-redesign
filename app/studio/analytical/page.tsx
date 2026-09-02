import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Analytical modules" };

export default async function AnalyticalStudio() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");
  const { data: mine } = await supabase.from("analytical_specs").select("slug, spec, status, updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(50);
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between"><Logo href="/dashboard" /><div className="flex items-center gap-2"><Link href="/studio" className="text-sm text-slate2 hover:text-ink">← Studio</Link><HeaderNav /></div></header>
      <h1 className="text-3xl text-ink">Analytical instruments</h1>
      <p className="mt-1 max-w-2xl text-slate2">Break a subject into units and score each against a scale you define, X-ray style. The AI classifies; the scoring is yours.</p>
      <Link href="/studio/analytical/start" className="group mt-6 block rounded-2xl border border-ai/30 bg-gradient-to-br from-white to-mist/40 p-5 transition hover:shadow-sm">
        <div className="flex items-center gap-4"><div className="text-3xl">✨</div><div className="min-w-0 flex-1"><div className="text-lg font-bold text-ink group-hover:text-ai">Describe your instrument, and build it</div><div className="mt-0.5 text-sm text-slate2">Name the subject, the units, and the scale.</div></div><span className="shrink-0 text-lg font-semibold text-ai">→</span></div>
      </Link>
      {(mine || []).length > 0 && (
        <div className="mt-8"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your analytical modules</div><div className="mt-2 space-y-2">
          {(mine || []).map((m: any) => (
            <div key={m.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white p-3"><div><span className="font-semibold text-ink">{m.spec?.emoji || "📊"} {m.spec?.name || m.slug}</span><span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate-500">{m.status}</span></div><div className="flex items-center gap-2"><Link href={`/studio/analytical/${m.slug}`} className="btn-ghost text-sm">Edit</Link><Link href={`/x/${m.slug}`} className="btn-ghost text-sm">Preview →</Link></div></div>
          ))}
        </div></div>
      )}
    </main>
  );
}
