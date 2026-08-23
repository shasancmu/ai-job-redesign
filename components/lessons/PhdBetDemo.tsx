"use client";

import { useState } from "react";

// The admissions bet, live. A committee is betting you'll publish ~5 papers to
// earn tenure. Publishing is a lottery, so P(5 of 5) is basically zero, the only
// way the bet pays off is a candidate with high quality (p per paper) AND high
// output (n papers). This is why the whole application is read as evidence of both.
function nCr(n: number, k: number) { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; }
function pAtLeast(k: number, n: number, p: number) { let s = 0; for (let i = k; i <= n; i++) s += nCr(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i); return s; }

export default function PhdBetDemo() {
  const [p, setP] = useState(20); // per-paper publish probability, %
  const [n, setN] = useState(6); // papers written over the tenure clock
  const prob = pAtLeast(5, n, p / 100); // P(>=5 published)
  const pct = Math.round(prob * 100);

  return (
    <div className="my-6 rounded-2xl border border-line bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Try it: the committee's bet</div>
      <p className="mt-1 text-sm text-slate-500">They need you to publish about 5 papers to earn tenure. What are the odds you clear that bar?</p>

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Quality: odds any one paper gets in <span className="text-slate-400">(E[p])</span></span>
            <span className="font-semibold tabular-nums text-ink">{p}%</span>
          </div>
          <input type="range" min={5} max={60} value={p} onChange={(e) => setP(parseInt(e.target.value, 10))} className="mt-1 w-full" aria-label="Per-paper quality" />
        </div>
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Drive: papers you actually write <span className="text-slate-400">(E[n])</span></span>
            <span className="font-semibold tabular-nums text-ink">{n}</span>
          </div>
          <input type="range" min={5} max={15} value={n} onChange={(e) => setN(parseInt(e.target.value, 10))} className="mt-1 w-full" aria-label="Papers written" />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-mist p-4 text-center">
        <div className="text-3xl font-bold tabular-nums" style={{ color: pct >= 50 ? "#3F7A52" : pct >= 20 ? "#B07A1E" : "#C0603A" }}>{pct}%</div>
        <div className="mt-0.5 text-xs text-slate-500">chance of publishing at least 5</div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Notice: raising <span className="font-semibold text-ink">either</span> quality or output alone barely rescues the bet, you need both high. That is exactly what the committee is reading your application for: evidence of E[p] (you can do good work) and E[n] (you will keep writing).
      </p>
    </div>
  );
}
