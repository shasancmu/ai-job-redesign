import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyLivingCases } from "@/lib/cases/store";
import HeaderNav from "@/components/HeaderNav";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "My living cases" };

function fmt(s?: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
}

export default async function MyCasesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cases/mine");
  const cases = await listMyLivingCases(user.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold text-ink">My living cases</h1>
        <Link href="/studio/upload" className="btn-primary text-sm">+ New case</Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">Interactive case studies you've authored. Publish one, then share its link with a class.</p>

      {cases.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-mist/30 p-10 text-center">
          <div className="text-3xl">🎬</div>
          <p className="mt-2 font-serif text-lg text-ink">No living cases yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Upload teaching materials or paste links in the studio, pick “Living Case,” and the studio drafts an interactive case you can publish.</p>
          <Link href="/studio/upload" className="btn-primary mt-4 inline-block text-sm">Author a case →</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {cases.map((c) => (
            <div key={c.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">{c.name || c.slug}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                  <span className={"rounded-full px-2 py-0.5 " + (c.status === "published" ? "bg-sage-soft text-sage" : "bg-amber-soft text-amber")}>{c.status}</span>
                  <span>updated {fmt(c.updated_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link href={`/cases/${c.slug}`} className="font-medium text-ai hover:underline">Open →</Link>
                <Link href={`/cases/${c.slug}/insights`} className="text-slate2 hover:text-ink">Insights</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
