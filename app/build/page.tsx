import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import { listAuthoredBy } from "@/lib/customModules";

export const dynamic = "force-dynamic";

export default async function BuildIndexPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0)) redirect("/dashboard");

  const mine = await listAuthoredBy(user.id).catch(() => []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Your modules</h1>
          <p className="mt-1 text-sm text-slate-500">Author-built interview + report modules. No code.</p>
        </div>
        <Link href="/build/new" className="btn-primary text-sm">+ New module</Link>
      </div>

      <Link href="/tutorial" className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-mist/40 px-4 py-3 transition hover:shadow-sm">
        <span className="text-sm text-slate-600"><span className="mr-1">📔</span> New here? Take the guided tour of the whole app.</span>
        <span className="flex-none text-sm font-semibold text-ai">Start →</span>
      </Link>

      <div className="mt-6 space-y-2">
        {mine.length === 0 && (
          <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-slate-400">
            No modules yet. <Link href="/build/new" className="font-semibold text-ai hover:underline">Build your first →</Link>
          </div>
        )}
        {mine.map((m) => (
          <div key={m.slug} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">{(m.spec as any)?.emoji} {m.name}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded-full bg-mist px-2 py-0.5 font-medium">{m.super_type}</span>
                <span className="rounded-full px-2 py-0.5 font-medium" style={{ background: m.org_id ? "#EAF2EC" : "#EFF3FA", color: m.org_id ? "#3F7A52" : "#4E79C9" }}>{m.org_id ? "Organization" : "Global"}</span>
                {m.status !== "published" && <span className="rounded-full bg-amber-soft px-2 py-0.5 font-medium text-amber">Draft</span>}
              </div>
            </div>
            <div className="flex flex-none items-center gap-3">
              <Link href={`/start/${m.slug}`} className="text-xs font-semibold text-ai hover:underline">Run</Link>
              <Link href={`/build/${m.slug}`} className="text-xs text-slate2 hover:text-ink">Edit</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
