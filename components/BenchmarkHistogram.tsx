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
  const aiScore = data.total; // a cheap AI model ≈ perfect on this test

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

      <div className="flex items-end gap-2" style={{ height: barH, paddingTop: 26 }}>
        {data.dist.map((count, score) => {
          const isYou = yourScore === score;
          const isAI = score === aiScore;
          return (
            <div
              key={score}
              className="relative flex flex-1 flex-col items-center justify-end gap-1"
              style={{ height: "100%" }}
            >
              {isAI && (
                <>
                  <div
                    className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed"
                    style={{ borderColor: "var(--amber)" }}
                  />
                  <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white">
                    ⚡ Cheap AI
                  </div>
                </>
              )}
              <div className={"z-10 text-xs font-semibold " + (count ? "text-ink" : "text-transparent")}>
                {count}
              </div>
              <div
                className="z-10 w-full rounded-t transition-all"
                style={{
                  height: `${(count / max) * (barH - 56)}px`,
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
        <b className="text-ink">⚡ How cheap AI performs:</b> ≈ {aiScore}/{data.total},
        in seconds, for pennies. The gap that matters is judgment — not speed.
      </div>
    </div>
  );
}
