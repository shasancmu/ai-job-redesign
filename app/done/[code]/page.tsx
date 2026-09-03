import Link from "next/link";
import Logo from "@/components/Logo";
import ModuleIcon from "@/components/ModuleIcon";
import { loadOwnerReport } from "@/lib/reportPage";
import { artifactHref, recommendedNext } from "@/lib/momentum";
import { artifactTitle } from "@/lib/artifactTitle";
import { moduleByExercise } from "@/lib/modules";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nicely done" };

// The moment someone finishes a module.
//
// Every room used to send Finish straight to /dashboard, which meant the best
// moment in the product — you just made the thing the exercise exists to
// produce — ended at scroll position zero of a fifteen-thousand-pixel catalogue
// that didn't mention what you'd made and suggested something else instead.
//
// So: name the artifact, hand it over, and offer exactly one next thing.
export default async function Done({ params }: { params: { code: string } }) {
  const { code, session, canvas } = await loadOwnerReport(params.code);
  const mod = moduleByExercise(session.exercise);
  const made = artifactTitle(canvas);
  const href = artifactHref(session.exercise, code);
  const hasReport = href !== `/room/${code}`;
  const next = recommendedNext(session.exercise);

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-xl flex-col px-6 py-8">
      <Logo href="/dashboard" />

      <div className="flex flex-1 flex-col justify-center py-12">
        <div className="eyebrow">{mod?.name || "Finished"}</div>

        {/* The artifact leads. If the room didn't produce one, the module's own
            name carries the sentence instead of a blank space. */}
        <h1 className="display mt-2 text-3xl leading-tight text-ink sm:text-4xl">
          {made || "That's finished."}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate2">
          {made
            ? "That's yours to keep — open it any time from your reports."
            : "Your work is saved. You can open it any time from your reports."}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {hasReport && (
            <Link href={href} className="btn-primary">
              Open your report →
            </Link>
          )}
          <Link href="/reports" className={hasReport ? "btn-ghost text-sm" : "btn-primary"}>
            All your reports
          </Link>
        </div>

        {/* One suggestion, never a grid. */}
        {next && (
          <div className="mt-12 border-t border-line pt-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">What usually comes next</div>
            <Link
              href={`/start/${next.slug}`}
              className="card mt-3 flex items-center gap-4 p-5 transition hover:shadow-lift"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mist text-ink">
                <ModuleIcon slug={next.slug} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink">{next.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-slate-400">{next.tagline}</div>
              </div>
              <span className="shrink-0 text-slate-400" aria-hidden>→</span>
            </Link>
          </div>
        )}

        <Link href="/dashboard" className="mt-8 self-start text-sm text-slate-400 hover:text-ink">
          ← Back to everything
        </Link>
      </div>
    </main>
  );
}
