"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UNTAGGED } from "@/lib/admin";

type Verb = { verb: string; count: number };
type Data = {
  responses: number;
  roleTotals: { ai: number; human: number };
  aiVerbs: Verb[];
  humanVerbs: Verb[];
  cellTotals: { key: string; label: string; role: string; count: number }[];
};

export default function AggregateView({ cohort }: { cohort: string }) {
  const [data, setData] = useState<Data | null>(null);
  const label = cohort === UNTAGGED ? "(untagged)" : cohort;

  const load = useCallback(async () => {
    const res = await fetch(
      `/facilitator/aggregate/data?cohort=${encodeURIComponent(cohort)}`,
      { cache: "no-store" }
    );
    if (res.ok) setData(await res.json());
  }, [cohort]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const total = data ? data.roleTotals.ai + data.roleTotals.human : 0;
  const aiPct = total ? Math.round((data!.roleTotals.ai / total) * 100) : 50;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/facilitator?cohort=${encodeURIComponent(cohort)}`}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            ← {label}
          </Link>
          <h1 className="mt-1 text-2xl font-bold">What the room decided</h1>
          <p className="text-sm text-slate-500">
            {data ? `${data.responses} redesigns so far` : "Loading…"} · updates
            live
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-sm text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          live
        </span>
      </div>

      {total === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          Nothing assigned yet — this fills in as pairs work through the 2×4 grid.
        </div>
      ) : (
        <div className="space-y-5">
          {/* AI vs Human split */}
          <div className="card p-5">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold">
              <span className="text-ai">Given to AI · {aiPct}%</span>
              <span className="text-human">Kept human · {100 - aiPct}%</span>
            </div>
            <div className="flex h-6 overflow-hidden rounded-full">
              <div className="bg-ai" style={{ width: `${aiPct}%` }} />
              <div className="bg-human" style={{ width: `${100 - aiPct}%` }} />
            </div>
          </div>

          {/* Human verb cloud — the "what humans are good at" moment */}
          <div className="card p-6">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-human">
              What the room says humans are for
            </div>
            <WordCloud verbs={data!.humanVerbs} color="#ea580c" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <VerbBars
              title="Handed to AI"
              verbs={data!.aiVerbs}
              color="#2563eb"
            />
            <VerbBars
              title="Kept human"
              verbs={data!.humanVerbs}
              color="#ea580c"
            />
          </div>
        </div>
      )}
    </main>
  );
}

function WordCloud({ verbs, color }: { verbs: Verb[]; color: string }) {
  if (verbs.length === 0)
    return <div className="text-slate-400">—</div>;
  const max = verbs[0].count;
  const min = verbs[verbs.length - 1].count;
  const size = (c: number) => {
    if (max === min) return 22;
    return 14 + Math.round(((c - min) / (max - min)) * 30);
  };
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {verbs.slice(0, 40).map((v) => (
        <span
          key={v.verb}
          style={{
            fontSize: size(v.count),
            color,
            opacity: 0.55 + 0.45 * (v.count / max),
            fontWeight: 600,
            lineHeight: 1.15,
          }}
          title={`${v.count}`}
        >
          {v.verb}
        </span>
      ))}
    </div>
  );
}

function VerbBars({
  title,
  verbs,
  color,
}: {
  title: string;
  verbs: Verb[];
  color: string;
}) {
  const top = verbs.slice(0, 10);
  const max = Math.max(1, ...top.map((v) => v.count));
  return (
    <div className="card p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </div>
      {top.length === 0 ? (
        <div className="text-slate-400">—</div>
      ) : (
        <div className="space-y-1.5">
          {top.map((v) => (
            <div key={v.verb} className="flex items-center gap-2">
              <div className="w-28 shrink-0 truncate text-right text-sm text-slate-600">
                {v.verb}
              </div>
              <div className="flex-1">
                <div
                  className="h-5 rounded"
                  style={{
                    width: `${(v.count / max) * 100}%`,
                    backgroundColor: color,
                    minWidth: 6,
                  }}
                />
              </div>
              <div className="w-6 text-sm font-semibold text-slate-500">
                {v.count}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
