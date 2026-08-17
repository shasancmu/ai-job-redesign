"use client";

// Cohort results plots for the negotiation modules.
//  • scatter  — you (x) vs counterpart (y), with the you+them = maxJoint frontier.
//               Points on the line reached an efficient deal; below = value left
//               on the table. The classic create-vs-claim picture.
//  • strip    — agreed prices across the ZOPA (distributive haggle distribution).

type ScatterRow = { name: string; you: number; them: number; noDeal?: boolean };
type StripRow = { name: string; price: number; noDeal?: boolean };

export function NegotiationScatter({ rows, maxJoint, counterpartName }: { rows: ScatterRow[]; maxJoint: number; counterpartName: string }) {
  const L = 48, R = 320, T = 16, B = 244;
  const W = R - L, H = B - T;
  const sx = (v: number) => L + (Math.max(0, Math.min(maxJoint, v)) / maxJoint) * W;
  const sy = (v: number) => B - (Math.max(0, Math.min(maxJoint, v)) / maxJoint) * H;
  const deals = rows.filter((r) => !r.noDeal);

  return (
    <div>
      <svg viewBox="0 0 340 280" className="w-full" role="img" aria-label="Negotiation results scatter">
        {/* frontier: you + them = maxJoint */}
        <line x1={sx(maxJoint)} y1={sy(0)} x2={sx(0)} y2={sy(maxJoint)} stroke="#3F7A52" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={sx(maxJoint / 2) + 6} y={sy(maxJoint / 2) - 6} fontSize="9" fill="#3F7A52" fontStyle="italic">efficient frontier</text>
        {/* axes */}
        <line x1={L} y1={T} x2={L} y2={B} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={L} y1={B} x2={R} y2={B} stroke="#cbd5e1" strokeWidth="1" />
        {/* points */}
        {deals.map((r, i) => {
          const eff = (r.you + r.them) / maxJoint;
          const c = eff >= 0.92 ? "#3F7A52" : eff >= 0.75 ? "#CE8F2C" : "#B4532E";
          return <circle key={i} cx={sx(r.you)} cy={sy(r.them)} r="5" fill={c} fillOpacity={0.8} stroke="#fff" strokeWidth="1.5" />;
        })}
        <text x={(L + R) / 2} y={272} textAnchor="middle" fontSize="11" fill="#64748b">Your score →</text>
        <text x={14} y={(T + B) / 2} textAnchor="middle" fontSize="11" fill="#64748b" transform={`rotate(-90 14 ${(T + B) / 2})`}>{counterpartName}'s score →</text>
      </svg>
      <p className="mt-1 text-xs text-slate-400">
        {deals.length} deals · on the dashed line = all value captured; below it = joint value left on the table. Far right + on the line = you claimed well AND created value.
      </p>
    </div>
  );
}

export function NegotiationStrip({ rows, lo, hi }: { rows: StripRow[]; lo: number; hi: number }) {
  const deals = rows.filter((r) => !r.noDeal);
  const pos = (p: number) => Math.max(0, Math.min(100, ((p - lo) / (hi - lo)) * 100));
  return (
    <div>
      <div className="relative mt-6 h-2 rounded-full" style={{ background: "linear-gradient(90deg,#3F7A52,#CE8F2C,#B4532E)" }}>
        {deals.map((r, i) => (
          <div key={i} className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink" style={{ left: `${pos(r.price)}%` }} title={`${r.name}: $${r.price.toLocaleString()}`} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>${lo.toLocaleString()} (buyer wins)</span>
        <span>${hi.toLocaleString()} (seller wins)</span>
      </div>
      <p className="mt-2 text-xs text-slate-400">{deals.length} deals across the bargaining zone. Left = the buyer claimed more of the gap.</p>
    </div>
  );
}
