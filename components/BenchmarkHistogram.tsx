"use client";

import { useCallback, useEffect, useState } from "react";

type Data = { dist: number[]; n: number; total: number; mean: number };

export default function BenchmarkHistogram({
  cohort,
  yourScore = null,
  big = false,
}: {
  cohort: string;
  yourScore?: number | null;
  big?: boolean;
}) {
  const [data, setData] = useState<Data | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/benchmark/histogram?cohort=${encodeURIComponent(cohort)}`,
      { cache: "no-store" }
    );
    if (res.ok) setData(await res.json());
  }, [cohort]);

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load]);

  if (!data) return <div className="text-slate2">Loading…</div>;
  const max = Math.max(1, ...data.dist);
  const barH = big ? 260 : 150;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-4 text-sm text-slate2">
        <span>
          <b className="text-ink">{data.n}</b> {data.n === 1 ? "person" : "people"}
        </span>
        <span>
          avg <b className="text-ink">{data.mean}</b>/{data.total}
        </span>
        <span className="text-sage">● live</span>
      </div>

      <div className="flex items-end gap-2" style={{ height: barH }}>
        {data.dist.map((count, score) => {
          const isYou = yourScore === score;
          return (
            <div key={score} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div className={"text-xs font-semibold " + (count ? "text-ink" : "text-transparent")}>
                {count}
              </div>
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${(count / max) * (barH - 44)}px`,
                  minHeight: count ? 4 : 0,
                  background: isYou ? "var(--sage)" : "#9db4c9",
                }}
                title={`${count} scored ${score}`}
              />
              <div className={"text-xs " + (isYou ? "font-bold text-sage" : "text-slate2")}>
                {score}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 text-center text-xs text-slate2">score out of {data.total}</div>

      {yourScore != null && (
        <div className="mt-3 text-center text-sm text-slate2">
          Your score <b className="text-sage">{yourScore}</b> is highlighted.
        </div>
      )}

      <div className="mt-4 rounded-xl bg-mist px-4 py-3 text-center text-sm text-slate2">
        AI on this test: <b className="text-ink">near-perfect</b>, in minutes, for
        pennies. The gap that matters is judgment — not speed.
      </div>
    </div>
  );
}
