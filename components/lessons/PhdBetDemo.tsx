"use client";

import { useState } from "react";

// The admissions bet, made tangible. A committee is betting you'll publish ~5
// papers to earn tenure. Publishing is a lottery, so P(5 of 5) is basically zero;
// the bet only pays off for a candidate with high quality (p per paper) AND high
// output (n papers). You set the two dials, then play out a career and watch the
// papers land or bounce — the "you need both" insight becomes something you see.
function nCr(n: number, k: number) { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; }
function pAtLeast(k: number, n: number, p: number) { let s = 0; for (let i = k; i <= n; i++) s += nCr(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i); return s; }

const NEED = 5; // accepted papers to earn tenure

export default function PhdBetDemo() {
  const [p, setP] = useState(20); // per-paper publish probability, %
  const [n, setN] = useState(6);  // papers written over the tenure clock
  const [draw, setDraw] = useState<boolean[] | null>(null); // a played-out career
  const [hist, setHist] = useState<number[] | null>(null);  // 100 careers: count by # accepted

  const prob = pAtLeast(NEED, n, p / 100);
  const pct = Math.round(prob * 100);
  const expected = (n * p) / 100;
  const accepted = draw ? draw.filter(Boolean).length : 0;
  const color = pct >= 50 ? "#3F7A52" : pct >= 20 ? "#B07A1E" : "#C0603A";

  const RUNS = 100;
  const histMax = hist ? Math.max(1, ...hist) : 1;
  const cleared = hist ? hist.slice(NEED).reduce((a, b) => a + b, 0) : 0;

  function play() { setDraw(Array.from({ length: n }, () => Math.random() < p / 100)); }
  function runMany() {
    const h = new Array(n + 1).fill(0);
    for (let c = 0; c < RUNS; c++) {
      let acc = 0;
      for (let i = 0; i < n; i++) if (Math.random() < p / 100) acc++;
      h[acc]++;
    }
    setHist(h);
  }
  const setPd = (v: number) => { setP(v); setDraw(null); setHist(null); };
  const setNd = (v: number) => { setN(v); setDraw(null); setHist(null); };

  return (
    <div className="my-6 rounded-2xl border border-line bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Try it: the committee&apos;s bet</div>
      <p className="mt-1 text-sm text-slate-500">Earning tenure takes about <b className="text-ink">{NEED} accepted papers</b>. Each paper is a long shot, so you need enough good shots. Set the two dials, then play out a career.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Quality: chance one paper gets in</span><span className="font-semibold tabular-nums text-ink">{p}%</span></div>
          <input type="range" min={5} max={60} value={p} onChange={(e) => setPd(parseInt(e.target.value, 10))} className="mt-1 w-full" aria-label="Quality: per-paper acceptance chance" />
          <div className="mt-0.5 text-[11px] text-slate-400">how good each paper is · E[p]</div>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Output: papers you write</span><span className="font-semibold tabular-nums text-ink">{n}</span></div>
          <input type="range" min={3} max={15} value={n} onChange={(e) => setNd(parseInt(e.target.value, 10))} className="mt-1 w-full" aria-label="Output: papers written" />
          <div className="mt-0.5 text-[11px] text-slate-400">how many shots you take · E[n]</div>
        </div>
      </div>

      {/* Your papers — one tile each. Play a career to see which land. */}
      <div className="mt-5">
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: n }).map((_, i) => {
            const state = draw ? (draw[i] ? "in" : "out") : "idle";
            return (
              <div key={i} title={state === "in" ? "Accepted" : state === "out" ? "Rejected" : "A paper you'll write"}
                className={"flex h-11 w-9 items-center justify-center rounded-md border text-base transition " +
                  (state === "in" ? "border-sage/40 bg-sage-soft text-sage" : state === "out" ? "border-line bg-mist text-slate-300" : "border-dashed border-line bg-white text-slate-300")}>
                {state === "in" ? "✓" : state === "out" ? "·" : "?"}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={play} className="btn-dark text-sm">{draw ? "Play again" : "Play out a career →"}</button>
          {draw && (
            <span className="text-sm text-slate-600">
              <b className="tabular-nums text-ink">{accepted}</b> of {n} landed:{" "}
              {accepted >= NEED ? <span className="font-semibold text-sage">🎉 tenure</span> : <span className="font-semibold text-clay">short by {NEED - accepted}</span>}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-mist p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Over a whole career at these odds</span>
          <span className="text-2xl font-bold tabular-nums" style={{ color }}>{pct}%</span>
        </div>
        <div className="mt-0.5 text-xs text-slate-400">clear the {NEED}-paper bar · you&apos;d expect about {expected.toFixed(1)} to get in</div>
      </div>

      {/* 100 careers → a histogram of outcomes, so the % above becomes a shape. */}
      <div className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <button onClick={runMany} className="btn-ghost text-sm">{hist ? "Run 100 more" : "Run 100 careers →"}</button>
          {hist && <span className="text-xs text-slate-500">Cleared {NEED}+ in <b className="tabular-nums text-ink">{cleared}</b> of {RUNS} careers</span>}
        </div>
        {hist && (
          <div className="mt-3">
            <div className="flex h-28 items-end gap-1">
              {hist.map((count, k) => (
                <div key={k} className="flex flex-1 flex-col items-center justify-end" title={`${count} of ${RUNS} careers published ${k}`}>
                  <div className="text-[10px] tabular-nums text-slate-400">{count || ""}</div>
                  <div className="w-full rounded-t transition-all" style={{ height: `${(count / histMax) * 100}%`, minHeight: count ? 2 : 0, background: k >= NEED ? "#3F7A52" : "#CBD5E1" }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-1">
              {hist.map((_, k) => (
                <div key={k} className={"flex-1 text-center text-[10px] tabular-nums " + (k >= NEED ? "font-semibold text-sage" : "text-slate-400")}>{k}</div>
              ))}
            </div>
            <div className="mt-1 text-center text-[11px] text-slate-400">papers published in a career · <span className="font-semibold text-sage">green = earned tenure</span></div>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Now try maxing <b className="text-ink">only</b> quality, or <b className="text-ink">only</b> output. Neither alone gets you there: the bet only pays off when both are high. That is exactly what the committee reads your application for: E[p] (you can do good work) and E[n] (you&apos;ll keep writing).
      </p>
    </div>
  );
}
