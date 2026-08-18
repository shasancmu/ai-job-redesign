"use client";

import { useMemo } from "react";
import type { CloudWord } from "@/lib/cloud";

// A projector-legible tag cloud: each phrase is sized by how many people wrote
// it, packed center-out, biggest first. No overlap, no external layout lib.
const PALETTE = ["var(--ink)", "var(--sage)", "var(--sky)", "var(--amber)", "var(--clay)"];

export default function WordCloud({ words, max = 120 }: { words: CloudWord[]; max?: number }) {
  const shown = useMemo(() => words.slice(0, max), [words, max]);
  const top = shown[0]?.count || 1;

  if (shown.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-300">
        <span className="text-lg">Responses will appear here.</span>
      </div>
    );
  }

  // Interleave from the front and back so the largest words sit near the center
  // and smaller ones fan outward, the way a word cloud reads.
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
    <div className="flex h-full flex-wrap content-center items-center justify-center gap-x-6 gap-y-2 px-4">
      {ordered.map((w) => {
        const t = Math.pow(w.count / top, 0.6); // 0..1, softened
        const size = 1.1 + t * 4.4; // rem: ~18px to ~90px
        const weight = 500 + Math.round(t * 300);
        const opacity = 0.55 + t * 0.45;
        const color = PALETTE[hashIndex(w.norm) % PALETTE.length];
        return (
          <span
            key={w.norm}
            title={w.count > 1 ? `${w.count} people` : "1 person"}
            className="cloud-word inline-block leading-none transition-all duration-500"
            style={{ fontSize: `${size}rem`, fontWeight: weight, color, opacity }}
          >
            {w.text}
          </span>
        );
      })}
      <style>{`
        @keyframes cloud-pop { from { opacity: 0; transform: scale(0.7); } to { opacity: inherit; transform: none; } }
        .cloud-word { animation: cloud-pop 0.45s cubic-bezier(0.22,0.61,0.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .cloud-word { animation: none; } }
      `}</style>
    </div>
  );
}

// Stable per-word color: hash the normalized text so a word keeps its color as
// the cloud re-renders on each poll.
function hashIndex(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
