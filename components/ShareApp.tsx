"use client";

import { useState } from "react";
import ShareBar from "@/components/ShareBar";

// Share Superadditive itself (the public homepage). No token needed.
export default function ShareApp({ label = "↗ Share Superadditive" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(!open)} className="btn-ghost text-sm">{label}</button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-2 w-[min(92vw,440px)] rounded-2xl border border-line bg-white p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Share Superadditive</span>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-ink">✕</button>
            </div>
            <ShareBar
              url="/"
              title="Superadditive"
              text="Superadditive: AI for business strategy and innovation. Real frameworks, run by AI, on your strategy, your bets, and your negotiations."
            />
          </div>
        </>
      )}
    </div>
  );
}
