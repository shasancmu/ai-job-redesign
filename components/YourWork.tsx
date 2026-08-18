import Link from "next/link";

export type WorkItem = { slug: string; name: string; done: boolean; href: string; at: string };

// A single lightweight "jump back in" row: your last few modules as chips (open
// a finished report, or resume an unfinished one), plus a compact door to all
// reports. Everything else — browse, recommendations — lives in the catalog
// below, so the dashboard opens calm.
export default function YourWork({
  recents,
  reportsCount,
}: {
  recents: WorkItem[];
  reportsCount: number;
}) {
  if (recents.length === 0 && reportsCount === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Jump back in</div>
      <div className="flex flex-wrap gap-2">
        {recents.map((it) => (
          <Link
            key={it.slug}
            href={it.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-ink transition hover:border-slate-300 hover:shadow-soft"
          >
            <span className="max-w-[190px] truncate font-medium">{it.name}</span>
            <span className="text-xs text-slate-400">· {it.done ? "report" : "resume"}</span>
          </Link>
        ))}
        {reportsCount > 0 && (
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3.5 py-1.5 text-sm font-medium text-slate2 transition hover:text-ink"
          >
            📄 All reports <span className="text-slate-400">({reportsCount})</span>
          </Link>
        )}
      </div>
    </section>
  );
}
