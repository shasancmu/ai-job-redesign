"use client";

import type { BoardVerdict as V } from "@/lib/board";

export default function BoardVerdict({ verdict }: { verdict: V }) {
  const rev = verdict.reversibility;
  const doorLabel = rev?.door === "one-way" ? "One-way door" : rev?.door === "two-way" ? "Two-way door" : rev?.door;
  const doorChip = rev?.door === "one-way" ? "bg-clay-soft text-clay" : "bg-sage-soft text-sage";

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-gradient-to-br from-white to-mist p-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The board&apos;s verdict</div>
        <p className="mt-1 text-lg font-semibold leading-snug text-ink">{verdict.verdict}</p>
      </div>

      {verdict.frame && (
        <Card label="The real choice" tone="ink">
          {verdict.frame}
        </Card>
      )}

      {verdict.economics && (
        <Card label="The economics" tone="amber">
          {verdict.economics}
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {rev?.note && (
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reversibility</span>
              {doorLabel && <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + doorChip}>{doorLabel}</span>}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{rev.note}</p>
          </div>
        )}
        {verdict.keyUncertainty && (
          <div className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-sky">The key unknown</div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{verdict.keyUncertainty}</p>
          </div>
        )}
      </div>

      {verdict.cheapestTest && (
        <Card label="Cheapest test before you commit" tone="sage">
          {verdict.cheapestTest}
        </Card>
      )}

      {verdict.tension && !verdict.frame && (
        <Card label="The core tension" tone="clay">
          {verdict.tension}
        </Card>
      )}

      {verdict.recommendation && (
        <div className="rounded-2xl border-2 border-ink/10 bg-mist p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">Recommended move</div>
          <p className="mt-1 text-sm font-medium leading-relaxed text-ink">{verdict.recommendation}</p>
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

function Card({ label, tone, children }: { label: string; tone: "ink" | "amber" | "sage" | "clay" | "sky"; children: any }) {
  const c: Record<string, string> = { ink: "text-ink", amber: "text-amber", sage: "text-sage", clay: "text-clay", sky: "text-sky" };
  return (
    <div className="card p-5">
      <div className={"text-xs font-semibold uppercase tracking-wide " + c[tone]}>{label}</div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{children}</p>
    </div>
  );
}
