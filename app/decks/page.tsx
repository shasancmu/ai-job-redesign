import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFor } from "@/lib/orgs";
import { listDecks } from "@/lib/decks";
import { ACTIVITY_TYPE_SET } from "@/lib/deckTypes";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await roleFor(user);
  if (!(role.superadmin || role.directorOrgIds.length > 0 || role.instructorOrgIds.length > 0)) redirect("/dashboard");

  const decks = await listDecks(user.id).catch(() => []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Presentations</h1>
          <p className="mt-1 text-sm text-slate-500">Slide decks with live Superadditive activities built in.</p>
        </div>
        <Link href="/decks/new" className="btn-primary text-sm">+ New presentation</Link>
      </div>

      <div className="mt-6 space-y-2">
        {decks.length === 0 && (
          <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-slate-400">
            No presentations yet. <Link href="/decks/new" className="font-semibold text-ai hover:underline">Build your first →</Link>
          </div>
        )}
        {decks.map((d) => {
          const activities = (d.slides || []).filter((s: any) => ACTIVITY_TYPE_SET.has(s.type)).length;
          return (
            <div key={d.slug} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{d.title || "Untitled"}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>{d.slides?.length || 0} slides</span>
                  {activities > 0 && <span className="rounded-full bg-clay-soft px-2 py-0.5 font-medium text-clay">{activities} live</span>}
                  {d.status !== "published" && <span className="rounded-full bg-amber-soft px-2 py-0.5 font-medium text-amber">Draft</span>}
                </div>
              </div>
              <div className="flex flex-none items-center gap-3">
                <Link href={`/decks/${d.slug}/present`} target="_blank" className="text-xs font-semibold text-ai hover:underline">Present</Link>
                <Link href={`/decks/${d.slug}/edit`} className="text-xs text-slate2 hover:text-ink">Edit</Link>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
