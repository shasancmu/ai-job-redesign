"use client";

import { useState } from "react";

// A single "Class summary" control: one button that opens a menu of the exercises
// this cohort actually ran, so the summary entry point stays one control no matter
// how many exercises the program includes.
export default function CohortSummaryMenu({ cohort, options }: { cohort: string; options: { key: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  if (!options.length) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
      >
        🎓 Class summary
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-white p-1 shadow-lift">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Present a summary of</div>
            {options.map((o) => (
              <a
                key={o.key}
                href={`/facilitator/summary?cohort=${encodeURIComponent(cohort)}&exercise=${o.key}`}
                className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-mist hover:text-ink"
              >
                {o.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
