import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { roleFor } from "@/lib/orgs";
import { ROLEPLAY_TEMPLATES } from "@/lib/mechanics/templates";

export const dynamic = "force-dynamic";

export default async function RoleplayStudio() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0)) redirect("/dashboard");

  const { data: mine, error: mineErr } = await supabase
    .from("module_specs")
    .select("slug, spec, status, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  const needsSetup = !!mineErr && /does not exist|relation|schema cache/i.test(mineErr.message || "");

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/studio" className="text-sm text-slate2 hover:text-ink">← Studio</Link><HeaderNav /></div>
      </header>
      {needsSetup && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-semibold">Setup needed: the role-play tables don't exist yet.</div>
          <p className="mt-1">You can build and preview modules, but nothing will save until an admin runs the role-play setup migration in the Supabase SQL editor. Modules created before then are not stored.</p>
        </div>
      )}
      <h1 className="text-3xl text-ink">Role-play modules</h1>
      <p className="mt-1 max-w-2xl text-slate2">Interrogation and simulation modules like The Earnings Call: a learner questions an AI character who won't lie but will spin, then makes a call under uncertainty. Start from a template, iterate with the Copilot, preview, no code.</p>

      {/* Template gallery */}
      <div className="mt-8">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Start from a template</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROLEPLAY_TEMPLATES.map((t) => (
            <div key={t.id} className="flex flex-col rounded-2xl border border-line bg-white p-4 transition hover:shadow-sm">
              <div className="text-2xl">{t.emoji}</div>
              <div className="mt-2 text-sm font-bold text-ink">{t.name}</div>
              <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t.domain}</div>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-500">{t.whenToUse}</p>
              <div className="mt-3 flex items-center gap-2">
                <Link href={`/studio/roleplay/new?from=${t.id}`} className="btn-primary text-sm">{t.id === "blank" ? "Start" : "Use template"}</Link>
                {t.runnable && <Link href={`/studio/roleplay/new?remix=${t.id}`} className="btn-ghost text-sm">Remix</Link>}
                {t.runnable && <Link href={`/m/${t.id}`} target="_blank" className="btn-ghost text-sm">Preview →</Link>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Your modules */}
      {(mine || []).length > 0 && (
        <div className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your modules</div>
          <div className="mt-2 space-y-2">
            {(mine || []).map((m: any) => (
              <div key={m.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white p-3">
                <div><span className="font-semibold text-ink">{m.spec?.meta?.emoji} {m.spec?.meta?.name || m.slug}</span><span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate-500">{m.status}</span></div>
                <div className="flex items-center gap-2"><Link href={`/studio/roleplay/${m.slug}`} className="btn-ghost text-sm">Edit</Link><Link href={`/studio/roleplay/new?remix=${m.slug}`} className="btn-ghost text-sm">Remix</Link><Link href={`/m/${m.slug}`} className="btn-ghost text-sm">Preview →</Link></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
