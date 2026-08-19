"use client";

import type { BoardVerdict as V } from "@/lib/board";

export default function BoardVerdict({ verdict }: { verdict: V }) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The board&apos;s verdict</div>
        <p className="mt-1 text-lg font-semibold leading-snug text-ink">{verdict.verdict}</p>
      </div>

      {verdict.tension && (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-clay">The core tension</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{verdict.tension}</p>
        </div>
      )}

      {verdict.recommendation && (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">Recommended move</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{verdict.recommendation}</p>
        </div>
      )}

      {(verdict.conditions || []).length > 0 && (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">What has to be true</div>
          <ul className="mt-2 space-y-1">
            {verdict.conditions.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700"><span className="text-slate-300">•</span><span>{c}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
