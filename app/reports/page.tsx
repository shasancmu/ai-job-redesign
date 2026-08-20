import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/modules";
import { artifactHref, timeAgo } from "@/lib/momentum";
import ModuleIcon from "@/components/ModuleIcon";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

// Every saved report/artifact this person has, in one place.
export default async function Reports() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, exercise, code, status, created_at")
    .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(300);

  // One report per module with a finished run, newest first. Group activities
  // (benchmark/network) have no personal artifact, so they're excluded.
  type R = { slug: string; name: string; href: string; at: string };
  const reports: R[] = [];
  for (const m of MODULES) {
    if (m.partner === "group") continue;
    const mine = (sessions || []).filter((s: any) => s.exercise === m.exercise);
    const doneRun = mine.find((s: any) => s.status === "done");
    if (!doneRun) continue;
    reports.push({ slug: m.slug, name: m.name, href: artifactHref(m.exercise, doneRun.code), at: doneRun.created_at });
  }
  reports.sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div>
          <Logo />
          <h1 className="mt-3 text-3xl text-ink">Your reports</h1>
          <p className="mt-1 text-sm text-slate2">Everything you&apos;ve saved, open any time.</p>
        </div>
        <HeaderNav />
      </header>

      {reports.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate-600">No reports yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate2">
            Every exercise ends in something you keep, a plan, a roadmap, an X-ray, a consult. Finish one and it lands here.
          </p>
          <Link href="/dashboard" className="btn-primary mt-4 inline-block text-sm">Browse exercises</Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((it) => (
            <div key={it.slug} className="card flex flex-col p-5 transition hover:shadow-lift">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mist text-ink">
                  <ModuleIcon slug={it.slug} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">{it.name}</div>
                  <div className="mt-0.5 text-xs text-slate-400">Saved {timeAgo(it.at)}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <Link href={it.href} className="font-medium text-ink hover:underline">Open report →</Link>
                <Link href={`/start/${it.slug}`} className="text-xs text-slate-400 hover:text-ink">Do again</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Footer />
    </main>
  );
}
