import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import { getMyOrgs } from "@/lib/orgs";
import {
  completedSlugs,
  transcriptFrom,
  bundlesFor,
  loadBundles,
  materializeBundles,
  levelFor,
  type BundleView,
} from "@/lib/credentials";

export const dynamic = "force-dynamic";
export const metadata = { title: "Achievements" };

function monthYear(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default async function AchievementsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/achievements");

  const myOrgs = await getMyOrgs(user.id).catch(() => []);
  const orgIds = myOrgs.map((m) => m.org.id);

  const completed = await completedSlugs(supabase, user.id);
  const transcript = transcriptFrom(completed);
  const count = transcript.length;
  const level = levelFor(count);

  // Load applicable bundles (built-in + global + this user's orgs') and
  // materialize the earned ones. Falls back to built-ins if the table/admin
  // client isn't available.
  let bundles: BundleView[] = bundlesFor(completed);
  let idMap: Awaited<ReturnType<typeof materializeBundles>> = new Map();
  try {
    const admin = createAdminClient();
    const defs = await loadBundles(admin, { orgIds });
    bundles = bundlesFor(completed, defs);
    idMap = await materializeBundles(admin, user.id, bundles);
  } catch {
    /* credentials table not available — render built-ins, unlinked */
  }
  const idFor = (key: string) => idMap.get(`track:${key}`)?.id;

  // Earned certificates first, then closest-to-done.
  const sorted = [...bundles].sort((a, b) =>
    a.earned !== b.earned ? (a.earned ? -1 : 1) : b.progressPct - a.progressPct,
  );
  const earnedCount = bundles.filter((b) => b.earned).length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <h1 className="text-2xl font-bold text-ink">Achievements</h1>
      <p className="mt-1 text-sm text-slate-500">
        Certificates are earned by completing a bundle of related exercises. Each finished exercise is progress toward one.
      </p>

      {/* Level */}
      <section className="card mt-6 p-6">
        {level.title ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl text-2xl font-bold text-white" style={{ background: "#14283A" }}>
              {count}
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Your level</div>
              <div className="text-xl font-bold text-ink">{level.title}</div>
              <div className="mt-0.5 text-sm text-slate-500">
                {count} {count === 1 ? "exercise" : "exercises"} completed
                {earnedCount > 0 && <> · {earnedCount} {earnedCount === 1 ? "certificate" : "certificates"}</>}
              </div>
              {level.next && (
                <>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-mist">
                    <div className="h-full rounded-full" style={{ background: "#3F7A52", width: `${Math.min(100, Math.round((count / (count + level.next.need)) * 100))}%` }} />
                  </div>
                  <div className="mt-1.5 text-xs text-slate-400">
                    {level.next.need} more to reach <span className="font-medium text-slate-500">{level.next.title}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-lg font-bold text-ink">No certificates yet</div>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Finish exercises to build toward a certificate. Most bundles are three exercises, about 45 minutes total.
            </p>
            <Link href="/dashboard" className="btn-primary mt-4 inline-block">Start an exercise</Link>
          </div>
        )}
      </section>

      {/* Certificates (bundles) */}
      <section className="mt-9">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Certificates</h2>
        <p className="mt-1 text-sm text-slate-400">Complete a bundle to earn a certificate you can add to LinkedIn.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {sorted.map((b) => (
            <BundleCard key={b.key} b={b} href={b.earned ? (idFor(b.key) ? `/c/${idFor(b.key)}` : undefined) : undefined} />
          ))}
        </div>
      </section>

      {/* Transcript (the record) */}
      {transcript.length > 0 && (
        <section className="mt-9">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Transcript</h2>
          <p className="mt-1 text-sm text-slate-400">Everything you&apos;ve completed. A record, not a credential.</p>
          <div className="card mt-4 divide-y divide-line">
            {transcript.map((t) => (
              <div key={t.slug} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex items-center gap-2.5 text-sm text-ink">
                  <Check />
                  {t.name}
                </div>
                <div className="text-xs text-slate-400">{monthYear(t.at)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="10" fill="#3F7A52" />
      <path d="M6 10.3l2.6 2.6L14.2 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Dot() {
  return <span className="inline-block h-[15px] w-[15px] flex-none rounded-full border-2 border-slate-200" aria-hidden />;
}

function BundleCard({ b, href }: { b: BundleView; href?: string }) {
  const core = b.items.filter((i) => i.kind === "core");
  const electives = b.items.filter((i) => i.kind === "elective");
  const inner = (
    <div className={"h-full rounded-2xl border p-5 transition " + (b.earned ? "border-line bg-white hover:shadow-sm" : "border-dashed border-line bg-mist/40")}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: b.earned ? "#3F7A52" : "#93A2B0" }}>
          {b.earned ? "Certificate earned" : `${b.remaining} to go`}
        </span>
        {b.earned && <Check />}
      </div>
      <div className="mt-2 text-lg font-bold text-ink">{b.name}</div>
      <p className="mt-1 text-sm text-slate-500">{b.line}</p>

      {!b.earned && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full" style={{ background: "#3F7A52", width: `${b.progressPct}%` }} />
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        {core.map((i) => (
          <div key={i.slug} className="flex items-center gap-2 text-[13px]">
            {i.done ? <Check /> : <Dot />}
            <span className={i.done ? "text-ink" : "text-slate-500"}>{i.name}</span>
          </div>
        ))}
        <div className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Electives · choose {b.elecNeeded} ({b.elecDone}/{b.elecNeeded})
        </div>
        {electives.map((i) => (
          <div key={i.slug} className="flex items-center gap-2 text-[13px]">
            {i.done ? <Check /> : <Dot />}
            <span className={i.done ? "text-ink" : "text-slate-400"}>{i.name}</span>
          </div>
        ))}
      </div>

      {b.earned && href && <div className="mt-3 text-sm font-semibold" style={{ color: "#3F7A52" }}>View &amp; share &rarr;</div>}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : <div>{inner}</div>;
}
