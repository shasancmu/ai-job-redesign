import Link from "next/link";
import Logo from "@/components/Logo";
import { allFrameworkGroups } from "@/lib/frameworks";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "The research behind the exercises",
  description: "The frameworks and findings each Superadditive exercise is built on.",
};

// Public reference: the research each exercise applies. Credibility + a way to
// learn the frameworks across modules.
export default function FrameworksPage() {
  const groups = allFrameworkGroups();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <Link href="/">
          <Logo />
        </Link>
      </header>

      <h1 className="text-3xl font-bold text-ink">The research behind the exercises</h1>
      <p className="mt-2 max-w-xl text-slate-600">
        Every exercise applies a real framework, not a generic prompt. Here are the ones that show up in the reports, with the finding each
        rests on and where it comes from.
      </p>

      <div className="mt-8 space-y-8">
        {groups.map((g) => (
          <section key={g.key}>
            <h2 className="text-sm font-bold uppercase tracking-wide text-sage">{g.label}</h2>
            <div className="mt-3 space-y-3">
              {g.items.map((f) => (
                <div key={f.name} className="rounded-2xl border border-line bg-white p-4">
                  <div className="text-base font-bold text-ink">{f.name}</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.finding}</p>
                  <p className="mt-1.5 text-xs italic text-slate-400">{f.cite}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-line bg-mist/50 p-6 text-center">
        <p className="text-sm text-slate-600">Learn one of these by doing it, in about 15 minutes.</p>
        <Link href="/login?mode=signup" className="btn-primary mt-3 inline-block">Sign up free</Link>
      </div>
    </main>
  );
}
