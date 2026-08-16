import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/modules";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

const ACCENT: Record<string, { chip: string; bar: string }> = {
  "reimagine-job": { chip: "bg-sage-soft text-sage", bar: "#4A6A4E" },
  "reimagine-workflow": { chip: "bg-sky-soft text-sky", bar: "#5B7FA6" },
  "solo-ai": { chip: "bg-amber-soft text-amber", bar: "#CE8F2C" },
};

function SunRings() {
  return (
    <svg
      className="pointer-events-none absolute -right-28 -top-28 h-[460px] w-[460px] opacity-[0.5]"
      viewBox="0 0 460 460"
      fill="none"
      aria-hidden="true"
    >
      {[220, 176, 132, 88].map((r, i) => (
        <circle
          key={r}
          cx="230"
          cy="230"
          r={r}
          stroke={i % 2 === 0 ? "#CE8F2C" : "#4A6A4E"}
          strokeOpacity={0.22 - i * 0.03}
          strokeWidth="1.5"
        />
      ))}
      <circle cx="230" cy="230" r="46" fill="#CE8F2C" fillOpacity="0.12" />
    </svg>
  );
}

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative overflow-hidden">
      <SunRings />
      <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <Logo />

        <div className="mt-14 max-w-2xl">
          <span className="eyebrow">In the age of AI</span>
          <h1 className="mt-4 text-5xl leading-[1.03] tracking-tight sm:text-6xl">
            Human <span className="text-amber">+</span> AI,
            <br />
            worth <em className="text-sage">more</em> together.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/70">
            Hands-on modules that redesign work for the age of AI — run them in a
            workshop, across your team, or on your own.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn-brand">
              Sign in
            </Link>
            <Link href="/login?mode=signup" className="btn-ghost">
              Create an account
            </Link>
            <Link href="/join" className="btn-ghost">
              Join as a guest
            </Link>
          </div>
        </div>

        <div className="mt-16">
          <span className="eyebrow">The modules</span>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => {
              const a = ACCENT[m.slug] || { chip: "bg-sage-soft text-sage", bar: "#4A6A4E" };
              return (
                <div key={m.slug} className="card group relative overflow-hidden p-5">
                  <span
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ background: a.bar }}
                  />
                  <div
                    className={
                      "flex h-11 w-11 items-center justify-center rounded-xl text-2xl " +
                      a.chip
                    }
                  >
                    {m.emoji}
                  </div>
                  <h3 className="mt-3 text-xl">{m.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink/60">
                    {m.tagline}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-line px-2 py-0.5 text-ink/60">
                      {m.mode}
                    </span>
                    <span className="text-ink/45">{m.minutes} min</span>
                    {m.ai && (
                      <span className="rounded-full bg-amber-soft px-2 py-0.5 font-medium text-amber">
                        AI partner
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-10 text-sm text-ink/50">
          Sign in to run a module. One-time pricing per module, or unlock them
          all — no subscription.
        </p>

        <Footer />
      </div>
    </main>
  );
}
