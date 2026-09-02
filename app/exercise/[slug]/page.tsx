import Link from "next/link";
import { notFound } from "next/navigation";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import ModuleIcon from "@/components/ModuleIcon";
import FeatureBadges from "@/components/FeatureBadges";
import { getModuleIntro } from "@/lib/moduleIntros";
import {
  MODULES,
  CATEGORIES,
  PARTNER_META,
  moduleBySlug,
  moduleCategory,
  moduleNeeds,
  modulePills,
  pillLabel,
} from "@/lib/modules";

// A public, linkable page per exercise. The library had no addressable pages at
// all — 90-odd cards that couldn't be clicked, shared, or indexed, and nothing
// a visitor could read before signing up. This is that page: what the exercise
// is, the research behind it, and what you leave with.
export const dynamic = "force-static";

function visible(slug: string) {
  const m = moduleBySlug(slug);
  return m && !m.hidden ? m : null;
}

export function generateStaticParams() {
  return MODULES.filter((m) => !m.hidden).map((m) => ({ slug: m.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const m = visible(params.slug);
  if (!m) return { title: "Exercise not found" };
  return {
    title: m.name,
    description: m.tagline,
    openGraph: { title: m.name, description: m.tagline },
  };
}

export default function ExercisePage({ params }: { params: { slug: string } }) {
  const m = visible(params.slug);
  if (!m) notFound();

  const cat = CATEGORIES.find((c) => c.key === moduleCategory(m.slug));
  const partner = PARTNER_META[m.partner];
  const pills = modulePills(m.slug);
  const needs = moduleNeeds(m.slug);
  // The same teaching cards the room shows on first entry — but here, where
  // someone is still deciding whether to spend 20 minutes on it.
  const steps = getModuleIntro(m).steps;
  // Group exercises are run by a facilitator against a cohort; there's nothing
  // for a lone visitor to start.
  const cohortOnly = m.partner === "group";

  return (
    <main className="mx-auto max-w-3xl px-6 py-6">
      <nav className="flex items-center justify-between py-2">
        <Logo href="/" />
        <div className="flex items-center gap-2">
          <Link href="/login" className="px-1 text-sm font-semibold text-ink/80 hover:text-ink">
            Sign in
          </Link>
          <Link href="/login?mode=signup" className="btn-dark">
            Get started
          </Link>
        </div>
      </nav>

      <Link href="/#library" className="mt-8 inline-block text-sm text-slate2 hover:text-ink">
        ← All exercises
      </Link>

      <header className="mt-4">
        <div className={"flex h-14 w-14 items-center justify-center rounded-2xl " + (cat?.chip || "bg-sage-soft text-sage")}>
          <ModuleIcon slug={m.slug} />
        </div>
        <h1 className="display mt-5 text-[2.25rem] leading-tight text-ink sm:text-[2.75rem]">{m.name}</h1>
        <p className="mt-3 text-lg leading-relaxed text-slate2">{m.tagline}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-ink/45">
          <span className={"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium " + partner.chip}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: partner.dot }} />
            {partner.label}
          </span>
          <span>{m.minutes} min</span>
          <FeatureBadges slug={m.slug} />
          {pills.map((p) => (
            <span key={p} className="rounded bg-mist px-2 py-0.5 text-[11px] font-medium text-slate-500">
              {pillLabel(p)}
            </span>
          ))}
        </div>

        {needs && (
          <p className="mt-5 rounded-lg bg-mist px-3 py-2 text-sm text-slate2">
            <span className="font-semibold text-ink">What you&apos;ll need:</span> {needs}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-4">
          {cohortOnly ? (
            <span className="rounded-lg bg-mist px-3 py-2.5 text-sm leading-relaxed text-slate2">
              This one runs live with a whole cohort — open your facilitator&apos;s link to take part.
            </span>
          ) : (
            <>
              <Link href={`/start/${m.slug}`} className="btn-primary">
                Start free →
              </Link>
              <span className="text-sm text-slate2">No card needed. The result is yours to keep.</span>
            </>
          )}
        </div>
      </header>

      {steps.length > 0 && (
        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="card p-5">
              <h2 className="text-sm font-bold text-ink">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate2">{s.body}</p>
            </div>
          ))}
        </section>
      )}

      <section className="mt-12">
        <h2 className="eyebrow">What it is</h2>
        <p className="mt-3 text-base leading-relaxed text-slate2">{m.description}</p>
      </section>

      {cat && (
        <section className="mt-12">
          <h2 className="eyebrow">Part of</h2>
          <div className="card mt-3 p-6">
            <div className="flex items-baseline gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: cat.dot }} />
              <h3 className="text-lg font-bold tracking-tight text-ink">{cat.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate2">{cat.blurb}</p>
            <Link href="/#library" className="mt-4 inline-block text-sm font-semibold text-sage hover:text-ink">
              Browse the library →
            </Link>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
