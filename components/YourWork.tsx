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
  return (
    <section className="mb-10">
      {/* Momentum */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Tile value={streak.current || "—"} label={streak.current ? "week streak" : "start a streak"} accent />
        <Tile value={`${exploredCount}/${total}`} label="modules explored" />
        <Tile value={artifactCount} label={artifactCount === 1 ? "piece of work saved" : "pieces of work saved"} />
      </div>

      <h2 className="eyebrow mb-3">Your work</h2>

      {items.length === 0 ? (
        <p className="rounded-xl bg-mist px-4 py-5 text-sm text-slate2">
          Your saved plans, roadmaps, and canvases will collect here as you go — a growing record you can return to.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.slug} className="card flex flex-col p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mist text-ink">
                  <ModuleIcon slug={it.slug} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">{it.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    <span className={"rounded-full px-1.5 py-0.5 font-medium " + (it.done ? "bg-sage-soft text-sage" : "bg-slate-100 text-slate-600")}>
                      {it.done ? "Done" : "In progress"}
                    </span>
                    <span>{timeAgo(it.at)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <Link href={it.href} className="font-medium text-ink hover:underline">
                  {it.done ? "View →" : "Continue →"}
                </Link>
                {it.done && (
                  <Link href={`/start/${it.slug}`} className="text-slate-400 hover:text-ink">
                    Do again
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
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
