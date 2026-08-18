"use client";

// The reveal: a live histogram of the room's scores, with the top band (where a
// small AI model lands) marked in sage.
export default function QuizResults({ scores, total }: { scores: number[]; total: number }) {
  const t = Math.max(1, total);
  const counts = Array.from({ length: t + 1 }, (_, i) => scores.filter((s) => s === i).length);
  const max = Math.max(1, ...counts);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const aiFrom = Math.ceil(t * 0.9); // a small model reliably lands in the top band

  return (
    <div className="flex h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 text-sm text-slate-500">
          <span>
            <b className="text-ink">{scores.length}</b> took it · average <b className="text-ink">{avg.toFixed(1)}</b> / {t}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--sage)" }} /> where AI scores
          </span>
        </div>

        <div className="flex h-[46vh] items-end justify-center gap-2">
          {counts.map((c, i) => {
            const h = (c / max) * 100;
            const isAI = i >= aiFrom;
            return (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="text-sm font-semibold text-ink">{c || ""}</div>
                <div
                  className="cloud-bar w-full rounded-t-lg"
                  style={{
                    height: `${h}%`,
                    minHeight: c ? "8px" : "0",
                    background: isAI ? "var(--sage)" : "var(--ink)",
                    animationDelay: `${i * 45}ms`,
                  }}
                />
                <div className="text-xs font-medium text-slate-400">{i}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-center text-xs uppercase tracking-[0.2em] text-slate-400">score (out of {t})</div>
      </div>
    </div>
  );
}
