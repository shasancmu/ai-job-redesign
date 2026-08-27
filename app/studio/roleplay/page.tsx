import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import { isAdmin } from "@/lib/admin";
import { BUILTIN_SPECS } from "@/lib/mechanics/seed";

export const dynamic = "force-dynamic";

export default async function RoleplayStudio() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/dashboard");

  const { data: mine } = await supabase
    .from("module_specs")
    .select("slug, spec, status, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const builtins = Object.keys(BUILTIN_SPECS);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/studio" className="text-sm text-slate2 hover:text-ink">← Studio</Link><HeaderNav /></div>
      </header>
      <h1 className="text-3xl text-ink">Role-play modules</h1>
      <p className="mt-1 max-w-2xl text-slate2">Build interrogation and simulation modules like The Earnings Call, with an AI copilot. Describe what you want, ground it in a document, iterate, and preview, without code.</p>

      <Link href="/studio/roleplay/new" className="btn-primary mt-6 inline-block">+ New module</Link>

      {(mine || []).length > 0 && (
        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your modules</div>
          <div className="mt-2 space-y-2">
            {(mine || []).map((m: any) => (
              <div key={m.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white p-3">
                <div><span className="font-semibold text-ink">{m.spec?.meta?.emoji} {m.spec?.meta?.name || m.slug}</span><span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate-500">{m.status}</span></div>
                <div className="flex items-center gap-2"><Link href={`/studio/roleplay/${m.slug}`} className="btn-ghost text-sm">Edit</Link><Link href={`/m/${m.slug}`} className="btn-ghost text-sm">Preview →</Link></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reference examples (clone to start)</div>
        <div className="mt-2 space-y-2">
          {builtins.map((slug) => (
            <div key={slug} className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-line p-3">
              <span className="font-mono text-sm text-slate-600">{slug}</span>
              <div className="flex items-center gap-2"><Link href={`/studio/roleplay/${slug}`} className="btn-ghost text-sm">Open</Link><Link href={`/m/${slug}`} className="btn-ghost text-sm">Preview →</Link></div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
