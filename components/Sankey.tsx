"use client";

// A minimal, dependency-free two-column Sankey: sources (researchers) on the
// left, targets (universities & companies) on the right, ribbons weighted by
// flow. Used to show the pipeline from science to industry.

type Link = { source: string; target: string; value: number };

const PALETTE = ["#3F7A52", "#3B7FB5", "#CE8F2C", "#C06A47", "#6C5CE7", "#2AA6A0", "#B4508E", "#5A7184", "#8A6D3B", "#4E79C9"];
const trunc = (s: string, n = 26) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export default function Sankey({ left, right, links, leftTitle = "Researchers", rightTitle = "Universities & companies", height = 460 }: { left: string[]; right: string[]; links: Link[]; leftTitle?: string; rightTitle?: string; height?: number }) {
  if (!links.length) return <div className="rounded-xl border border-line bg-mist py-10 text-center text-sm text-slate2">Not enough patent-citation data to trace the pipeline.</div>;

  const W = 760, H = height, pad = 26, labelW = 168, nodeW = 12;
  const leftX = labelW, rightX = W - labelW - nodeW;

  // Node totals + order (largest first).
  const lt = new Map<string, number>(), rt = new Map<string, number>();
  for (const l of links) { lt.set(l.source, (lt.get(l.source) || 0) + l.value); rt.set(l.target, (rt.get(l.target) || 0) + l.value); }
  const L = left.filter((n) => lt.has(n)).sort((a, b) => (lt.get(b) || 0) - (lt.get(a) || 0));
  const R = right.filter((n) => rt.has(n)).sort((a, b) => (rt.get(b) || 0) - (rt.get(a) || 0));
  const total = [...lt.values()].reduce((s, v) => s + v, 0) || 1;

  const gap = 8;
  const usable = H - 2 * pad - (Math.max(L.length, R.length) - 1) * gap;
  const scale = usable / total;

  // Position nodes; track running offsets for ribbon stacking.
  type N = { name: string; y: number; h: number; out: number; in: number };
  const place = (names: string[], tot: Map<string, number>): Record<string, N> => {
    const o: Record<string, N> = {}; let y = pad;
    for (const name of names) { const h = (tot.get(name) || 0) * scale; o[name] = { name, y, h, out: 0, in: 0 }; y += h + gap; }
    return o;
  };
  const ln = place(L, lt), rn = place(R, rt);
  const color = new Map(L.map((n, i) => [n, PALETTE[i % PALETTE.length]]));

  // Ribbons, stacked in source order then value.
  const ordered = [...links].sort((a, b) => (L.indexOf(a.source) - L.indexOf(b.source)) || (b.value - a.value));
  const ribbons = ordered.map((l, i) => {
    const s = ln[l.source], t = rn[l.target]; if (!s || !t) return null;
    const th = l.value * scale;
    const sy0 = s.y + s.out, ty0 = t.y + t.in; s.out += th; t.in += th;
    const x1 = leftX + nodeW, x2 = rightX, xm = (x1 + x2) / 2;
    const d = `M ${x1},${sy0} C ${xm},${sy0} ${xm},${ty0} ${x2},${ty0} L ${x2},${ty0 + th} C ${xm},${ty0 + th} ${xm},${sy0 + th} ${x1},${sy0 + th} Z`;
    return <path key={i} d={d} fill={color.get(l.source)} fillOpacity={0.38} />;
  });

  const nodeRects = (o: Record<string, N>, x: number) => Object.values(o).map((n, i) => <rect key={i} x={x} y={n.y} width={nodeW} height={Math.max(1, n.h)} rx={2} fill="#14283A" />);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <text x={leftX + nodeW} y={14} textAnchor="start" fontSize={11} fill="#94a3b8" style={{ fontWeight: 700, letterSpacing: 0.5 }}>{leftTitle.toUpperCase()}</text>
        <text x={rightX} y={14} textAnchor="end" fontSize={11} fill="#94a3b8" style={{ fontWeight: 700, letterSpacing: 0.5 }}>{rightTitle.toUpperCase()}</text>
        {ribbons}
        {nodeRects(ln, leftX)}
        {nodeRects(rn, rightX)}
        {L.map((n) => <text key={n} x={leftX - 6} y={ln[n].y + ln[n].h / 2 + 3.5} textAnchor="end" fontSize={11} fill="#334155">{trunc(n)}</text>)}
        {R.map((n) => <text key={n} x={rightX + nodeW + 6} y={rn[n].y + rn[n].h / 2 + 3.5} textAnchor="start" fontSize={11} fill="#334155">{trunc(n)}</text>)}
      </svg>
    </div>
  );
}
