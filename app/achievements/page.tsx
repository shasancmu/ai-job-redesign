import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Logo from "@/components/Logo";
import HeaderNav from "@/components/HeaderNav";
import CredentialCard from "@/components/CredentialCard";
import {
  completedSlugs,
  earnedFrom,
  materializeCredentials,
  TRACKS,
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const holder = (profile as any)?.display_name || user.email?.split("@")[0] || "You";

  const completed = await completedSlugs(supabase, user.id);
  const completedSet = new Set(completed.map((c) => c.slug));
  const earned = earnedFrom(completed);

  // Materialize so each credential has a stable id + verify page (service role).
  // If the table isn't migrated yet, the wall still renders (cards just aren't
  // linked to a verify page).
  let idMap: Awaited<ReturnType<typeof materializeCredentials>> = new Map();
  try {
    const admin = createAdminClient();
    idMap = await materializeCredentials(admin, user.id, earned);
  } catch {
    /* credentials table not available — render unlinked */
  }
  const idFor = (kind: "exercise" | "track", key: string) => idMap.get(`${kind}:${key}`)?.id;

  const { level, count } = earned;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Logo href="/dashboard" />
        <HeaderNav />
      </header>

      <h1 className="text-2xl font-bold text-ink">Achievements</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every exercise you finish is a credential you can verify and post.
      </p>

      {/* Level */}
      <section className="card mt-6 p-6">
        {level.title ? (
          <div className="flex flex-wrap items-center gap-4">
            <div
              className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl text-2xl font-bold text-white"
              style={{ background: "#14283A" }}
            >
              {count}
            </div>
            <div className="min-w-[180px] flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Your level
              </div>
              <div className="text-xl font-bold text-ink">{level.title}</div>
              <div className="mt-0.5 text-sm text-slate-500">
                {count} {count === 1 ? "exercise" : "exercises"} completed
              </div>
              {level.next && (
                <>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-mist">
                    <div
                      className="h-full rounded-full"
                      style={{
                        background: "#3F7A52",
                        width: `${Math.min(100, Math.round((count / (count + level.next.need)) * 100))}%`,
                      }}
                    />
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
            <div className="text-lg font-bold text-ink">No credentials yet</div>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Finish your first exercise to earn a credential and reach Explorer. It takes about 15 minutes.
            </p>
            <Link href="/dashboard" className="btn-primary mt-4 inline-block">
              Start an exercise
            </Link>
          </div>
        )}
      </section>

      {/* Track certificates */}
      <section className="mt-9">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Certificates</h2>
        <p className="mt-1 text-sm text-slate-400">
          Finish a full track to earn a certificate you can add to LinkedIn.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TRACKS.map((t) => {
            const have = t.slugs.filter((s) => completedSet.has(s)).length;
            const done = have === t.slugs.length;
            const id = done ? idFor("track", t.key) : undefined;
            const inner = (
              <div
                className={
                  "h-full rounded-2xl border p-5 transition " +
                  (done
                    ? "border-line bg-white hover:shadow-sm"
                    : "border-dashed border-line bg-mist/40")
                }
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: done ? "#3F7A52" : "#93A2B0" }}
                  >
                    {done ? "Certificate earned" : `${have} / ${t.slugs.length}`}
                  </span>
                  {done && (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                      <circle cx="10" cy="10" r="10" fill="#3F7A52" />
                      <path d="M6 10.3l2.6 2.6L14.2 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="mt-2 text-lg font-bold text-ink">{t.name}</div>
                <p className="mt-1 text-sm text-slate-500">{t.line}</p>
                {!done && (
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full"
                      style={{ background: "#3F7A52", width: `${(have / t.slugs.length) * 100}%` }}
                    />
                  </div>
                )}
                {done && (
                  <div className="mt-3 text-sm font-semibold" style={{ color: "#3F7A52" }}>
                    View &amp; share &rarr;
                  </div>
                )}
              </div>
            );
            return done && id ? (
              <Link key={t.key} href={`/c/${id}`} className="block">
                {inner}
              </Link>
            ) : (
              <div key={t.key}>{inner}</div>
            );
          })}
        </div>
      </section>

      {/* Exercise credentials */}
      {earned.exercises.length > 0 && (
        <section className="mt-9">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Credentials ({earned.exercises.length})
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {earned.exercises.map((e) => {
              const id = idFor("exercise", e.slug);
              const card = (
                <CredentialCard
                  eyebrow="Credential"
                  title={e.name}
                  line={e.line}
                  holder={holder}
                  dateLabel={monthYear(e.at)}
                  variant="wall"
                />
              );
              return id ? (
                <Link key={e.slug} href={`/c/${id}`} className="block transition hover:-translate-y-0.5">
                  {card}
                </Link>
              ) : (
                <div key={e.slug}>{card}</div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
