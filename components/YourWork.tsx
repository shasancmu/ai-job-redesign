import Link from "next/link";
import ModuleIcon from "@/components/ModuleIcon";
import { timeAgo } from "@/lib/momentum";

export type WorkItem = { slug: string; name: string; done: boolean; href: string; at: string };

// A compact top strip: the one thing you were working on last, and a door to
// your saved reports. Everything else (browse, recommendations) lives below in
// the catalog, so the dashboard opens calm.
export default function YourWork({
  recent,
  reportsCount,
}: {
  recent: WorkItem | null;
  reportsCount: number;
}) {
  if (!recent && reportsCount === 0) return null;
  const two = !!recent && reportsCount > 0;

  return (
    <section className="mb-8">
      <div className={"grid gap-3 " + (two ? "sm:grid-cols-2" : "")}>
        {recent && (
          <Link href={recent.href} className="card group flex items-center gap-4 p-5 transition hover:shadow-lift">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mist text-ink">
              <ModuleIcon slug={recent.slug} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {recent.done ? "Last opened" : "Pick up where you left off"}
              </div>
              <div className="truncate font-bold text-ink">{recent.name}</div>
              <div className="text-xs text-slate-400">{timeAgo(recent.at)}</div>
            </div>
            <span className="shrink-0 text-sm font-medium text-ink group-hover:underline">
              {recent.done ? "Open →" : "Continue →"}
            </span>
          </Link>
        )}

        {reportsCount > 0 && (
          <Link href="/reports" className="card group flex items-center gap-4 p-5 transition hover:shadow-lift">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-xl">📄</div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your reports</div>
              <div className="font-bold text-ink">{reportsCount} saved</div>
              <div className="text-xs text-slate-400">Open any time</div>
            </div>
            <span className="shrink-0 text-sm font-medium text-ink group-hover:underline">View all →</span>
          </Link>
        )}
      </div>
    </section>
  );
}
