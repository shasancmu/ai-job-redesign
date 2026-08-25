"use client";

import Link from "next/link";
import { recommendedNext } from "@/lib/momentum";

// Shown at the completion moment of a module: a single suggested next module to
// keep momentum. Falls back to a gentle "browse more" for custom/unmapped ones.
export default function NextUp({ exercise }: { exercise: string }) {
  const next = recommendedNext(exercise);

  if (!next) {
    return (
      <Link href="/dashboard" className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-mist/40 p-4 no-print transition hover:shadow-sm">
        <span className="text-sm text-slate-600">Nicely done. Ready for another?</span>
        <span className="flex-none text-sm font-semibold text-ai">Browse modules →</span>
      </Link>
    );
  }

  const tag = next.tagline && next.tagline.length > 96 ? next.tagline.slice(0, 95) + "…" : next.tagline;
  return (
    <div className="rounded-2xl border border-line bg-white p-4 no-print">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recommended next</div>
      <Link href={`/start/${next.slug}`} className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-line bg-mist/30 p-3 transition hover:shadow-sm">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{next.emoji ? `${next.emoji} ` : ""}{next.name}</span>
          {tag && <span className="mt-0.5 block text-xs text-slate-500">{tag}</span>}
        </span>
        <span className="flex-none text-sm font-semibold text-ai">Start →</span>
      </Link>
    </div>
  );
}
