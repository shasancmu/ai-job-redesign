"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CloudWord } from "@/lib/cloud";

// A projector-legible tag cloud sized by frequency (duplicated words grow), with
// a cinematic entrance. The whole cloud auto-scales to fit its container so it
// never overflows the screen, however many words come in. No external layout lib.
const PALETTE = ["var(--ink)", "var(--sage)", "var(--sky)", "var(--amber)", "var(--clay)"];

export default function WordCloud({ words, max = 120 }: { words: CloudWord[]; max?: number }) {
  const shown = useMemo(() => words.slice(0, max), [words, max]);
  const top = shown[0]?.count || 1;
  const rank = useMemo(() => {
    const m = new Map<string, number>();
    shown.forEach((w, i) => m.set(w.norm, i));
    return m;
  }, [shown]);

  // Auto-fit: measure the cloud against its container and scale it down to fit.
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      const c = containerRef.current, inner = innerRef.current;
      if (!c || !inner) return;
      const sw = inner.scrollWidth, sh = inner.scrollHeight;
      const cw = c.clientWidth, ch = c.clientHeight;
      if (!sw || !sh || !cw || !ch) return;
      const s = Math.min(1, cw / sw, ch / sh);
      setScale(s > 0 && Number.isFinite(s) ? s : 1);
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    const t = setTimeout(fit, 400); // after entrance animation settles
    return () => { ro?.disconnect(); clearTimeout(t); };
  }, [shown]);

  if (shown.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-300">
        <span className="text-lg">Responses will appear here.</span>
      </div>
    );
  }

  // Interleave from front and back so the largest words sit near the center.
  const ordered: CloudWord[] = [];
  let lo = 0, hi = shown.length - 1, front = true;
  while (lo <= hi) { if (front) ordered.push(shown[lo++]); else ordered.unshift(shown[hi--]); front = !front; }

  // Base size range narrows as the cloud gets busier; the auto-fit scale then
  // guarantees everything is visible.
  const n = shown.length;
  const maxRem = Math.max(2.4, Math.min(6, 7 - n * 0.13));
  const minRem = Math.max(0.9, maxRem * 0.24);

  return (
    <div ref={containerRef} className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div style={{ transform: `scale(${scale})`, transformOrigin: "center center", width: "100%", transition: "transform .35s ease" }}>
        <div ref={innerRef} className="cloud-breathe flex flex-wrap content-center items-center justify-center gap-x-6 gap-y-1 px-6">
          {ordered.map((w) => {
            const t = Math.pow(w.count / top, 0.6);
            const size = minRem + t * (maxRem - minRem);
            const weight = 500 + Math.round(t * 300);
            const opacity = 0.62 + t * 0.38;
            const color = PALETTE[hashIndex(w.norm) % PALETTE.length];
            const r = rank.get(w.norm) ?? 0;
            const delay = Math.min(r * 42, 1500);
            const glow = t > 0.72;
            return (
              <span
                key={w.norm}
                title={w.count > 1 ? `${w.count} people` : "1 person"}
                className="cloud-word inline-block leading-none"
                style={{
                  fontSize: `${size}rem`,
                  fontWeight: weight,
                  color,
                  ["--o" as any]: opacity,
                  opacity,
                  animationDelay: `${delay}ms`,
                  textShadow: glow ? `0 0 34px color-mix(in srgb, ${color} 45%, transparent)` : undefined,
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes cloud-materialize {
          0%   { opacity: 0; transform: translateY(16px) scale(.72); filter: blur(7px); }
          55%  { filter: blur(0); }
          100% { opacity: var(--o, 1); transform: none; filter: blur(0); }
        }
        @keyframes cloud-breathe {
          0%, 100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-5px) scale(1.008); }
        }
        .cloud-word { animation: cloud-materialize .72s cubic-bezier(.2,.7,.25,1) both; will-change: transform, opacity, filter; }
        .cloud-breathe { animation: cloud-breathe 8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .cloud-word, .cloud-breathe { animation: none; } }
      `}</style>
    </div>
  );
}

function hashIndex(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
