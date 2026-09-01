"use client";

import { useState, type ReactNode } from "react";

// Wrap a dashboard card to give it a quiet dismiss (✕). Persists in a cookie the
// server reads, so a dismissed card is simply not rendered next time (no flash).
export default function Dismissible({ id, children }: { id: string; children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const cur = document.cookie.split("; ").find((c) => c.startsWith("dash_dismissed="))?.split("=")[1] || "";
      const set = new Set(decodeURIComponent(cur).split(",").filter(Boolean));
      set.add(id);
      document.cookie = `dash_dismissed=${encodeURIComponent([...set].join(","))}; path=/; max-age=${60 * 60 * 24 * 365}`;
    } catch { /* cookies unavailable — hide for this session at least */ }
    setHidden(true);
  }

  return (
    <div className="group relative">
      <button onClick={dismiss} aria-label="Dismiss" title="Dismiss" className="absolute right-2 top-2 z-10 rounded-full bg-white/70 p-1 text-xs leading-none text-slate-300 opacity-0 backdrop-blur transition hover:bg-mist hover:text-slate-500 focus:opacity-100 group-hover:opacity-100">✕</button>
      {children}
    </div>
  );
}
