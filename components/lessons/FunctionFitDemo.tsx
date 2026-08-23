"use client";

import { useState } from "react";

// Learning a function from examples, made concrete: predict a home's price from
// its size. Nobody hands the machine a price-per-square-foot rule; it looks at
// homes that already sold and finds the line that best fits price against size.
// With few sales the line is shaky; with more, it locks in. That's statistical
// learning, and why data is the bottleneck.
// Each point is [size in sq ft, price in $thousands].
const POINTS: [number, number][] = [
  [600, 205], [800, 225], [1000, 285], [1150, 280], [1300, 340], [1450, 330],
  [1600, 395], [1750, 390], [1900, 455], [2050, 440], [2200, 500], [2350, 495],
  [2500, 560], [2650, 545], [2800, 610], [2950, 600],
];
const X_MIN = 500, X_MAX = 3000, Y_MIN = 150, Y_MAX = 700;

function ols(pts: [number, number][]) {
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p[0], 0);
  const sy = pts.reduce((s, p) => s + p[1], 0);
  const sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

export default function FunctionFitDemo() {
  const [many, setMany] = useState(false);
  const pts = many ? POINTS : POINTS.filter((_, i) => i % 4 === 0);
  const { slope, intercept } = ols(pts);

  const W = 420, H = 260, pad = 34;
  const px = (x: number) => pad + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - pad * 2);
  const py = (y: number) => H - pad - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (H - pad * 2);
  const lineY = (x: number) => Math.max(Y_MIN, Math.min(Y_MAX, slope * x + intercept));

  return (
    <div className="my-6 rounded-2xl border border-line bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Try it: predict a home&rsquo;s price from its size</div>
      <p className="mt-1 text-sm text-slate-500">Nobody gives the machine a price-per-square-foot rule. It looks at homes that already sold (the dots) and finds the line that best fits price against size.</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#D2D8CD" strokeWidth="1.5" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#D2D8CD" strokeWidth="1.5" />
        <line x1={px(X_MIN)} y1={py(lineY(X_MIN))} x2={px(X_MAX)} y2={py(lineY(X_MAX))} stroke="#3F7A52" strokeWidth="2.5" />
        {pts.map((p, i) => <circle key={i} cx={px(p[0])} cy={py(p[1])} r="4" fill="#14283A" />)}
        <text x={pad} y={pad - 12} fontSize="11" fill="#93A2B0">price ($k)</text>
        <text x={W - pad} y={H - 10} textAnchor="end" fontSize="11" fill="#93A2B0">home size (sq ft) →</text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button onClick={() => setMany((m) => !m)} className="btn-ghost text-sm">{many ? "Show fewer sales" : "Add more sales →"}</button>
        <span className="text-xs text-slate-400 tabular-nums">learned rule: about ${(slope * 1000).toFixed(0)}/sq ft + ${intercept.toFixed(0)}k base &nbsp;·&nbsp; {pts.length} homes</span>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        With only a few sales the line wobbles; with more it settles. The machine learned the pricing rule <span className="italic">from the data</span>, so its ceiling is the data. A neural network does the same thing, just with a far more flexible curve than a straight line.
      </p>
    </div>
  );
}
