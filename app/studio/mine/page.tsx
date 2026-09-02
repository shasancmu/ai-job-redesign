import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleFor } from "@/lib/orgs";
import { listMyStudioModules } from "@/lib/studioIndex";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your modules" };

function when(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (d <= 0) return "today";
    if (d === 1) return "yesterday";
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

// Everything you've built in the studio, across every type, newest first — so you
// never have to remember which kind a module was to get back and edit it.
export default async function MyModulesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/studio/mine");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");

  const admin = createAdminClient();
  const mods = await listMyStudioModules(admin, user.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2"><Link href="/studio" className="text-sm text-slate2 hover:text-ink">← Studio</Link><HeaderNav /></div>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-ink">Your modules</h1>
          <p className="mt-1 text-slate2">Everything you&apos;ve built, all types in one place. {mods.length} total.</p>
        </div>
        <Link href="/studio/create" className="btn-primary text-sm">+ New module</Link>
      </div>

      {mods.length === 0 ? (
        /* A first-timer's most useful next move isn't a link to a page of
           choices — it's one completed loop. Name the shortest path, and put
           the guide beside it rather than three cards away. */
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-8">
          <h2 className="font-serif text-xl text-ink">Nothing here yet — let&apos;s make one.</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate2">
            The quickest way in is to hand it something you already teach. Drop in a deck or a reading
            and it proposes a few modules it could become; you pick one, look over the handful of
            decisions that matter, and publish. About five minutes.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/studio/upload" className="btn-primary text-sm">Start from your materials →</Link>
            <Link href="/studio/upload?start=interview" className="btn-ghost text-sm">No materials? Talk it through</Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Rather understand it first? <Link href="/studio/guide" className="font-medium text-ai hover:underline">What a module is, and how to build one</Link> — a five-minute read.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-line">
          {mods.map((m, i) => (
            <div key={`${m.kind}-${m.slug}`} className={"flex flex-wrap items-center gap-3 bg-white px-4 py-3 " + (i > 0 ? "border-t border-line" : "")}>
              <span className="text-xl" aria-hidden>{m.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{m.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="rounded-full bg-mist px-2 py-0.5 font-medium text-slate-500">{m.kindLabel}</span>
                  {m.status !== "published" && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">{m.status}</span>}
                  {m.updatedAt && <span>edited {when(m.updatedAt)}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {m.runHref && <Link href={m.runHref} target="_blank" className="btn-ghost text-xs">Preview</Link>}
                <Link href={m.editHref} className="btn-dark text-xs">Edit</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
