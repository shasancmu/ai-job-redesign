import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SALEABLE_MODULES, PARTNER_META } from "@/lib/modules";
import Logo from "@/components/Logo";
import ModuleIcon from "@/components/ModuleIcon";
import Footer from "@/components/Footer";

const ACCENT: Record<string, string> = {
  "reimagine-job": "bg-sage-soft text-sage",
  "reimagine-workflow": "bg-sky-soft text-sky",
  "solo-ai": "bg-amber-soft text-amber",
};

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main>
      {/* Hero with the signature flowing gradient ribbon */}
      <div className="hero-wrap">
        <div className="ribbon" />
        <div className="ribbon-2" />
        <div className="mx-auto max-w-6xl px-6">
          <nav className="flex items-center justify-between py-5">
            <Logo />
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden text-sm font-semibold text-ink/80 hover:text-ink sm:inline">
                Sign in
              </Link>
              <Link href="/login?mode=signup" className="btn-dark">
                Get started
              </Link>
            </div>
          </nav>

          <div className="max-w-2xl pb-28 pt-16 sm:pb-36 sm:pt-24">
            <span className="eyebrow">Strategic org design in the age of AI</span>
            <h1 className="display mt-4 text-[2.75rem] text-ink sm:text-[4rem]">
              Human + AI, worth more together.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate2">
              Everyone&apos;s asking how to use AI. The sharper question is how to
              use <span className="text-ink">humans</span>. Hands-on modules that
              redesign the work so people and AI each do what they do best.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary">
                Sign in <span aria-hidden>→</span>
              </Link>
              <Link href="/join" className="btn-ghost">
                Join as a guest
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Thesis */}
      <section className="mx-auto mt-4 max-w-4xl px-6 text-center sm:mt-10">
        <p className="text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-[1.9rem]">
          AI is far more capable than we&apos;re treating it — we&apos;re using a{" "}
          <span className="text-amber">Ferrari for grocery runs</span>. Humans are
          far more valuable than we deploy them — we&apos;re using{" "}
          <span className="text-sage">architects to lay bricks</span>.
        </p>
        <p className="mt-4 text-slate2">
          Companies that gain from AI rethink the work — they don&apos;t patch it.
          Every module helps you do exactly that.
        </p>
      </section>

      {/* Modules */}
      <section className="mx-auto mt-16 max-w-6xl px-6">
        <span className="eyebrow">The modules</span>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SALEABLE_MODULES.map((m) => (
            <div key={m.slug} className="card p-6 transition hover:shadow-lift">
              <div
                className={
                  "flex h-11 w-11 items-center justify-center rounded-xl " +
                  (ACCENT[m.slug] || "bg-sage-soft text-sage")
                }
              >
                <ModuleIcon slug={m.slug} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink">{m.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate2">{m.tagline}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-ink/45">
                <span
                  className={
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium " +
                    PARTNER_META[m.partner].chip
                  }
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: PARTNER_META[m.partner].dot }} />
                  {PARTNER_META[m.partner].label}
                </span>
                <span>{m.minutes} min</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Get started */}
      <section className="mx-auto mt-16 max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-mist p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-ink">Ready to reimagine the work?</h2>
            <p className="mt-1 text-slate2">Create an account and run a module in minutes.</p>
          </div>
          <Link href="/login?mode=signup" className="btn-primary">
            Create an account
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <Footer />
      </div>
    </main>
  );
}
