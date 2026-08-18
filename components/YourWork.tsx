import Link from "next/link";
import ModuleIcon from "@/components/ModuleIcon";
import { timeAgo } from "@/lib/momentum";

export type WorkItem = { slug: string; name: string; done: boolean; href: string; at: string };
export type NextItem = { slug: string; name: string; tagline: string };

export default function YourWork({
  streak,
  exploredCount,
  total,
  artifactCount,
  items,
  next,
}: {
  streak: { current: number; best: number };
  exploredCount: number;
  total: number;
  artifactCount: number;
  items: WorkItem[];
  next: NextItem | null;
}) {
  const reports = items.filter((i) => i.done);
  const active = items.filter((i) => !i.done);

  return (
    <section className="mb-10">
      {/* Momentum */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Tile value={streak.current || "—"} label={streak.current ? "week streak" : "start a streak"} accent />
        <Tile value={`${exploredCount}/${total}`} label="modules explored" />
        <Tile value={artifactCount} label={artifactCount === 1 ? "report saved" : "reports saved"} />
      </div>

      {/* Your reports — the saved outputs, front and center */}
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="eyebrow">Your reports</h2>
        {reports.length > 0 && <span className="text-xs text-slate-400">{reports.length} saved · open any time</span>}
      </div>

      {reports.length === 0 ? (
        <p className="rounded-xl bg-mist px-4 py-5 text-sm text-slate2">
          Every exercise ends in something you keep, a plan, a roadmap, an X-ray, a consult. Finish one and it lands here, ready to reopen.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((it) => (
            <div key={it.slug} className="card flex flex-col p-4 transition hover:shadow-lift">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mist text-ink">
                  <ModuleIcon slug={it.slug} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">{it.name}</div>
                  <div className="mt-0.5 text-xs text-slate-400">Saved {timeAgo(it.at)}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <Link href={it.href} className="font-medium text-ink hover:underline">Open report →</Link>
                <Link href={`/start/${it.slug}`} className="text-xs text-slate-400 hover:text-ink">Do again</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* In progress — pick up where you left off */}
      {active.length > 0 && (
        <>
          <h2 className="eyebrow mb-3 mt-6">Pick up where you left off</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((it) => (
              <Link key={it.slug} href={it.href} className="card group flex items-center gap-3 p-4 transition hover:shadow-lift">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mist text-ink">
                  <ModuleIcon slug={it.slug} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">{it.name}</div>
                  <div className="mt-0.5 text-xs text-slate-400">Continue · {timeAgo(it.at)}</div>
                </div>
                <span className="shrink-0 text-slate-300 transition group-hover:text-ink">→</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Recommended next step */}
      {next && (
        <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border-2 border-ink/10 bg-mist p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-ink">
              <ModuleIcon slug={next.slug} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your next step</div>
              <div className="text-sm font-bold text-ink">{next.name}</div>
              <div className="text-xs text-slate2">{next.tagline}</div>
            </div>
          </div>
          <Link href={`/start/${next.slug}`} className="btn-primary shrink-0 text-sm">
            Start →
          </Link>
        </div>
      )}
    </section>
  );
}

function Tile({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className={"rounded-xl p-4 " + (accent ? "bg-ink text-white" : "bg-mist")}>
      <div className={"text-2xl font-bold " + (accent ? "text-white" : "text-ink")}>{value}</div>
      <div className={"text-xs " + (accent ? "text-white/70" : "text-slate-500")}>{label}</div>
    </div>
  );
}
