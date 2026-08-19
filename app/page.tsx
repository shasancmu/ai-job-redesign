import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import HeroVisual from "@/components/HeroVisual";
import LandingLibrary from "@/components/LandingLibrary";
import Footer from "@/components/Footer";

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
        <div className="relative mx-auto max-w-6xl px-6">
          <HeroVisual />
          <nav className="relative z-10 flex items-center justify-between py-5">
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

          <div className="relative z-10 max-w-2xl pb-28 pt-16 sm:pb-36 sm:pt-24">
            <span className="eyebrow">AI for business strategy and innovation</span>
            <h1 className="display mt-4 text-[2.75rem] text-ink sm:text-[4rem]">
              Better strategy, with AI as your partner.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate2">
              Superadditive puts real business frameworks to work on your
              strategy, your innovation bets, your negotiations, and your own
              job. AI runs the interview, plays your counterpart, and coaches the
              debrief. You bring the judgment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary">
                Start your first exercise <span aria-hidden>→</span>
              </Link>
            </div>
            <div className="mt-4">
              <a
                href="mailto:shasanx@gmail.com?subject=Running%20Superadditive%20for%20a%20team"
                className="text-sm font-medium text-slate2 underline-offset-4 hover:text-ink hover:underline"
              >
                Running this for a team? <span aria-hidden>→</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Thesis */}
      <section className="mx-auto mt-4 max-w-4xl px-6 text-center sm:mt-10">
        <p className="text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-[2.1rem]">
          Companies that gain from AI <span className="text-sage">reimagine the work</span>. They don&apos;t patch it. Every exercise helps you do exactly that.
        </p>
      </section>

      {/* Exercises */}
      <section className="mx-auto mt-16 max-w-6xl px-6">
        <span className="eyebrow">The library</span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          A library of exercises, each run by AI.
        </h2>
        <p className="mt-2 max-w-2xl text-slate2">
          Every one is grounded in a real framework, run by an AI interviewer, partner, counterpart, or coach, and
          ends in something you keep. Do them on your own, with a partner, or live with a cohort. Filter by theme to
          find your starting point.
        </p>

        <LandingLibrary />
      </section>

      {/* Get started */}
      <section className="mx-auto mt-16 max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-mist p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-ink">Ready to reimagine the work?</h2>
            <p className="mt-1 text-slate2">
              Create an account and start an exercise in minutes, or{" "}
              <a
                href="mailto:shasanx@gmail.com?subject=Running%20Superadditive%20for%20a%20team"
                className="font-medium text-ink underline underline-offset-4 hover:text-sage"
              >
                run it for a team
              </a>
              .
            </p>
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
