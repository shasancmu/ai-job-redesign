"use client";

import { useMemo } from "react";
import type { CloudWord } from "@/lib/cloud";

// A projector-legible tag cloud sized by frequency, with a cinematic entrance:
// words materialize (blur -> sharp, rise + scale) staggered biggest-first, the
// top words carry a soft glow, and the whole cloud breathes gently so it feels
// alive. No external layout lib.
const PALETTE = ["var(--ink)", "var(--sage)", "var(--sky)", "var(--amber)", "var(--clay)"];

export default function WordCloud({ words, max = 120 }: { words: CloudWord[]; max?: number }) {
  const shown = useMemo(() => words.slice(0, max), [words, max]);
  const top = shown[0]?.count || 1;
  // Rank (0 = most frequent) drives the entrance stagger, independent of layout.
  const rank = useMemo(() => {
    const m = new Map<string, number>();
    shown.forEach((w, i) => m.set(w.norm, i));
    return m;
  }, [shown]);

  if (shown.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-300">
        <span className="text-lg">Responses will appear here.</span>
      </div>
    );
  }

  // Interleave from front and back so the largest words sit near the center and
  // smaller ones fan outward, the way a word cloud reads.
  const ordered: CloudWord[] = [];
  let lo = 0;
  let hi = shown.length - 1;
  let front = true;
  while (lo <= hi) {
    if (front) ordered.push(shown[lo++]);
    else ordered.unshift(shown[hi--]);
    front = !front;
  }

  return (
    <div className="cloud-breathe flex h-full flex-wrap content-center items-center justify-center gap-x-7 gap-y-2 px-6">
      {ordered.map((w) => {
        const t = Math.pow(w.count / top, 0.6); // 0..1, softened
        const size = 1.15 + t * 4.6; // rem: ~18px to ~93px
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
        .cloud-word {
          animation: cloud-materialize .72s cubic-bezier(.2,.7,.25,1) both;
          will-change: transform, opacity, filter;
        }
        .cloud-breathe { animation: cloud-breathe 8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cloud-word { animation: none; }
          .cloud-breathe { animation: none; }
        }
      `}</style>
    </div>
  );
}

// Stable per-word color across polls.
function hashIndex(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
