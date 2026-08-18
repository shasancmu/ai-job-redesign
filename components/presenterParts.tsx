"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Shared building blocks for the live-activity presenters (word cloud, photo
// wall): the anticipation "join" splash, the AI summary reveal, the particle
// burst, the ambient aurora, and the count-up hook.

export type Summary = { themes: string[]; answer: string } | null;
export const DOT_COLORS = ["var(--sage)", "var(--sky)", "var(--amber)", "var(--clay)", "var(--ink)"];
const DOT_CAP = 300;

// Collecting: big join + a live, tension-building response core.
export function JoinSplash({
  qrSvg,
  code,
  joinHost,
  count,
  raw,
  ripples,
  closed,
  label = "responses",
}: {
  qrSvg: string;
  code: string;
  joinHost: string;
  count: number;
  raw: number;
  ripples: { id: number; delay: number }[];
  closed: boolean;
  label?: string;
}) {
  const dots = Math.min(raw, DOT_CAP);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-7 px-6 text-center">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-14">
        {qrSvg ? (
          <div className="cloud-qr h-52 w-52 rounded-3xl bg-white p-4 shadow-lift [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        ) : null}
        <div className="text-left">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Join from your phone</div>
          <div className="mt-1 text-2xl font-medium text-slate2">
            Go to <span className="font-bold text-ink">{joinHost}</span>
          </div>
          <div className="mt-3 text-sm text-slate-400">and enter the code</div>
          <div className="font-mono text-7xl font-extrabold tracking-[0.15em] text-ink">{code}</div>
        </div>
      </div>

      {closed ? (
        <div className="text-lg text-slate-400">this activity is closed</div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="cloud-livepill inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
            <span className="cloud-livedot" /> Live · collecting
          </div>

          <div className="relative flex h-40 w-full items-center justify-center">
            <span className="cloud-halo" aria-hidden />
            {ripples.map((r) => (
              <span key={r.id} className="cloud-ripple" style={{ animationDelay: `${r.delay}ms` }} aria-hidden />
            ))}
            <div key={raw} className="cloud-countpop relative">
              <span className="cloud-ai-text text-[7rem] font-extrabold leading-none tabular-nums sm:text-[8.5rem]">{count}</span>
            </div>
          </div>

          <div className="-mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{label}</div>

          {dots > 0 && (
            <div className="mt-1 flex max-w-2xl flex-wrap items-center justify-center gap-1.5">
              {Array.from({ length: dots }).map((_, i) => (
                <span key={i} className="cloud-dot" style={{ background: DOT_COLORS[i % DOT_COLORS.length], animationDelay: `${(i % 10) * 30}ms` }} />
              ))}
              {raw > DOT_CAP && <span className="ml-1 text-sm font-semibold text-slate-400">+{raw - DOT_CAP}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// The arresting AI summary.
export function SummaryReveal({ summary, loading, onRetry }: { summary: Summary; loading: boolean; onRetry: () => void }) {
  return (
    <div className="cloud-rise w-full max-w-3xl">
      <div className="cloud-sum-border rounded-[26px]">
        <div className="rounded-[24px] bg-white/85 px-8 py-8 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="cloud-ai-dot" />
            <span className="cloud-ai-text">Synthesized live by AI</span>
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              <div className="cloud-shimmer h-6 w-2/3 rounded-full" />
              <div className="cloud-shimmer h-4 w-full rounded-full" />
              <div className="cloud-shimmer h-4 w-11/12 rounded-full" />
              <div className="cloud-shimmer h-4 w-4/5 rounded-full" />
              <div className="mt-4 text-sm text-slate-400">Reading the room…</div>
            </div>
          ) : !summary ? (
            <div className="mt-6 text-slate-500">
              Couldn&apos;t build a summary yet.{" "}
              <button onClick={onRetry} className="font-medium text-ink underline">Try again</button>
            </div>
          ) : (
            <>
              {summary.themes?.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {summary.themes.map((t, i) => (
                    <span key={i} className="cloud-theme rounded-full border border-line bg-white px-4 py-1.5 text-base font-semibold text-ink shadow-soft" style={{ animationDelay: `${240 + i * 110}ms` }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {summary.answer && (
                <p className="cloud-answer mt-6 text-xl leading-relaxed text-ink" style={{ animationDelay: `${300 + (summary.themes?.length || 0) * 110}ms` }}>
                  {summary.answer}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// A restrained particle burst at the moment of reveal.
export function RevealBurst() {
  const [gone, setGone] = useState(false);
  const parts = useMemo(() => {
    const cols = ["var(--sage)", "var(--sky)", "var(--amber)", "var(--clay)", "var(--ink)"];
    return Array.from({ length: 40 }).map((_, i) => {
      const ang = Math.random() * Math.PI * 2;
      const dist = 130 + Math.random() * 300;
      return {
        tx: Math.cos(ang) * dist,
        ty: Math.sin(ang) * dist - (70 + Math.random() * 90),
        col: cols[i % cols.length],
        delay: Math.random() * 90,
        w: 5 + Math.random() * 7,
        h: 8 + Math.random() * 9,
        rot: (Math.random() * 2 - 1) * 220,
        dur: 950 + Math.random() * 550,
      };
    });
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 1700);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center" aria-hidden>
      <span className="cloud-flash" />
      {parts.map((p, i) => (
        <span
          key={i}
          className="cloud-part"
          style={{
            width: p.w,
            height: p.h,
            background: p.col,
            ["--tx" as any]: `${p.tx}px`,
            ["--ty" as any]: `${p.ty}px`,
            ["--rot" as any]: `${p.rot}deg`,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.dur}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function Aurora() {
  return (
    <div className="cloud-aurora" aria-hidden>
      <span className="cloud-blob b1" />
      <span className="cloud-blob b2" />
      <span className="cloud-blob b3" />
    </div>
  );
}

export function useCountUp(target: number, ms = 650): number {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    from.current = val;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from.current + (target - from.current) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}
