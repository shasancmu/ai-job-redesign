import type { SimResult } from "@/lib/experiment";

// The summary graph the slides ask for: the main outcome for Control vs
// Treatment, split by the pre-treatment moderator (Low / High), with 95%
// confidence whiskers. The gap between the two Treatment bars is the
// heterogeneous effect (b3) made visible.
export default function ExperimentPlot({ result, outcome, moderator }: { result: SimResult; outcome: string; moderator: string }) {
  const cells = result.cells;
  const W = 460, H = 300, padL = 46, padR = 16, padT = 18, padB = 54;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  const los = cells.map((c) => c.mean - 1.96 * c.se);
  const his = cells.map((c) => c.mean + 1.96 * c.se);
  let yMin = Math.min(...los), yMax = Math.max(...his);
  const span = yMax - yMin || 1;
  yMin -= span * 0.15; yMax += span * 0.12;
  const py = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const groups: { label: string; mod: "Low" | "High" }[] = [
    { label: `Low ${clip(moderator, 16)}`, mod: "Low" },
    { label: `High ${clip(moderator, 16)}`, mod: "High" },
  ];
  const groupW = plotW / groups.length;
  const barW = groupW * 0.28;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${outcome} by arm and ${moderator}`}>
      {/* y axis */}
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#D2D8CD" strokeWidth="1.5" />
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#D2D8CD" strokeWidth="1.5" />
      {[0, 0.5, 1].map((f) => {
        const v = yMin + f * (yMax - yMin);
        return (
          <g key={f}>
            <line x1={padL - 3} y1={py(v)} x2={padL} y2={py(v)} stroke="#D2D8CD" />
            <text x={padL - 6} y={py(v) + 3} textAnchor="end" fontSize="10" fill="#93A2B0">{v.toFixed(0)}</text>
          </g>
        );
      })}

      {groups.map((g, gi) => {
        const gx = padL + gi * groupW + groupW / 2;
        const arms: { arm: "Control" | "Treatment"; color: string; dx: number }[] = [
          { arm: "Control", color: "#93A2B0", dx: -barW * 0.62 },
          { arm: "Treatment", color: "#3F7A52", dx: barW * 0.62 },
        ];
        return (
          <g key={g.mod}>
            {arms.map((a) => {
              const c = cells.find((cc) => cc.arm === a.arm && cc.mod === g.mod);
              if (!c) return null;
              const x = gx + a.dx - barW / 2;
              const yTop = py(c.mean);
              return (
                <g key={a.arm}>
                  <rect x={x} y={yTop} width={barW} height={H - padB - yTop} rx="3" fill={a.color} opacity={a.arm === "Control" ? 0.55 : 0.92} />
                  {/* 95% CI whisker */}
                  <line x1={x + barW / 2} y1={py(c.mean - 1.96 * c.se)} x2={x + barW / 2} y2={py(c.mean + 1.96 * c.se)} stroke="#14283A" strokeWidth="1.4" />
                  <line x1={x + barW / 2 - 4} y1={py(c.mean - 1.96 * c.se)} x2={x + barW / 2 + 4} y2={py(c.mean - 1.96 * c.se)} stroke="#14283A" strokeWidth="1.4" />
                  <line x1={x + barW / 2 - 4} y1={py(c.mean + 1.96 * c.se)} x2={x + barW / 2 + 4} y2={py(c.mean + 1.96 * c.se)} stroke="#14283A" strokeWidth="1.4" />
                </g>
              );
            })}
            <text x={gx} y={H - padB + 16} textAnchor="middle" fontSize="11" fontWeight="600" fill="#14283A">{g.label}</text>
          </g>
        );
      })}

      {/* legend */}
      <g transform={`translate(${padL + 4}, ${H - 14})`}>
        <rect x="0" y="-8" width="10" height="10" rx="2" fill="#93A2B0" opacity="0.55" />
        <text x="15" y="1" fontSize="10" fill="#6E7A70">Control</text>
        <rect x="70" y="-8" width="10" height="10" rx="2" fill="#3F7A52" opacity="0.92" />
        <text x="85" y="1" fontSize="10" fill="#6E7A70">Treatment</text>
      </g>

      <text x={12} y={padT + plotH / 2} textAnchor="middle" fontSize="11" fontWeight="600" fill="#14283A" transform={`rotate(-90 12 ${padT + plotH / 2})`}>{clip(outcome, 24)}</text>
    </svg>
  );
}
