"use client";

// ============================================================================
// Report kit — a small, shared set of primitives for building scannable,
// layered reports. Grounded in visual-communication research:
//   - quantities are encoded as POSITION/LENGTH (bars, meters), which people
//     read far more accurately than numbers-in-prose (Cleveland & McGill);
//   - detail is behind PROGRESSIVE DISCLOSURE (<Drill>), so the default view is
//     short and the reader chooses what to open (Nielsen/Norman);
//   - a few reused primitives give every report ONE visual grammar (Gestalt).
// ============================================================================

import { useState, type ReactNode } from "react";

// Tone by value: high = sage (good), mid = amber, low = slate. One consistent
// meaning of color across every report.
function toneColor(pct: number): string {
  if (pct >= 66) return "var(--sage)";
  if (pct >= 33) return "#CE8F2C";
  return "#9aa7b4";
}

// A 0-100 meter: big number + a length-encoded bar. The primary way to show a
// score, because length is the most accurately-read visual channel.
export function Meter({ label, value, suffix = "/100", hint }: { label: string; value: number; suffix?: string; hint?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-ink">{pct}</span>
        <span className="text-xs text-slate-400">{suffix}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: toneColor(pct) }} />
      </div>
      {hint && <div className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</div>}
    </div>
  );
}

// A big-number stat (counts). Size is preattentive, so the number reads first.
export function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-2xl font-bold text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] leading-snug text-slate-400">{hint}</div>}
    </div>
  );
}

// A tiny trajectory line. Shape (rising/flat) is grasped preattentively.
export function Sparkline({ points, label, hint }: { points: number[]; label: string; hint?: string }) {
  const n = points.length;
  const max = Math.max(1, ...points);
  const min = Math.min(...points, 0);
  const W = 96, H = 30;
  const path = points
    .map((v, i) => {
      const x = n > 1 ? (i / (n - 1)) * W : 0;
      const y = H - ((v - min) / (max - min || 1)) * H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const rising = n > 1 && points[n - 1] >= points[0];
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" style={{ height: 30 }} preserveAspectRatio="none">
        <path d={path} fill="none" stroke={rising ? "var(--sage)" : "#9aa7b4"} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {hint && <div className="mt-0.5 text-[11px] leading-snug text-slate-400">{hint}</div>}
    </div>
  );
}

// Horizontal ranked bars — a compact "leaderboard" that reads at a glance.
export function BarList({ rows, unit }: { rows: { label: string; value: number; sub?: string }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-40 shrink-0 truncate text-xs text-slate2" title={r.label}>{r.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-mist">
            <div className="h-full rounded-full bg-sky" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-semibold text-slate2">{r.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

// Progressive disclosure. A native <details> so it's accessible and JS-free;
// closed by default so the report stays short. `count` hints at what's inside.
export function Drill({ title, count, children, defaultOpen = false, tone = "default" }: { title: string; count?: number | string; children: ReactNode; defaultOpen?: boolean; tone?: "default" | "warn" }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-line bg-white [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={"shrink-0 text-slate-400 transition-transform group-open:rotate-90"}><path d="m9 18 6-6-6-6" /></svg>
        <span className={"text-sm font-bold " + (tone === "warn" ? "text-clay" : "text-ink")}>{title}</span>
        {count != null && <span className="ml-auto rounded-full bg-mist px-2 py-0.5 text-xs font-medium text-slate2">{count}</span>}
      </summary>
      <div className="border-t border-line px-5 py-4">{children}</div>
    </details>
  );
}

// One row of a ranked, expandable list (an expert, a paper). Collapsed shows the
// scan line; expanded reveals the detail. Keeps long lists short by default.
export function RankRow({ rank, title, right, sub, children }: { rank?: number; title: string; right?: ReactNode; sub?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const canOpen = !!children;
  return (
    <div className="px-4 py-3">
      <div className={"flex items-center gap-3" + (canOpen ? " cursor-pointer" : "")} onClick={() => canOpen && setOpen((o) => !o)}>
        {rank != null && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{rank}</span>}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{title}</div>
          {sub && <div className="truncate text-xs text-slate-400">{sub}</div>}
        </div>
        {right}
        {canOpen && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={"shrink-0 text-slate-300 transition-transform " + (open ? "rotate-90" : "")}><path d="m9 18 6-6-6-6" /></svg>
        )}
      </div>
      {open && children && <div className="mt-2 pl-9">{children}</div>}
    </div>
  );
}

// A compact potential chip (Sci/Com/Soc) for dense rows.
export function PotChip({ label, value }: { label: string; value?: number }) {
  const v = Math.round(value || 0);
  const color = v >= 80 ? "var(--sage)" : v >= 60 ? "#CE8F2C" : "#9aa7b4";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-mist px-1.5 py-0.5 text-[10px] font-medium text-slate2">
      {label}<span className="font-bold" style={{ color }}>{v}</span>
    </span>
  );
}
