"use client";

import { useEffect, useRef, useState } from "react";
import type { CollabNode, CollabEdge, ShouldTalk } from "@/lib/domainBrief";

// A collaboration network: nodes are the domain's experts (sized by commercial
// potential, colored by organization), solid links are real co-authorships, and
// dashed amber links are SUGGESTED collaborations, pairs who work on very
// similar topics but have never co-authored (the structural holes to bridge).

const W = 720;
const H = 520;
const PALETTE = ["#3F7A52", "#3B7FB5", "#CE8F2C", "#C06A47", "#6C5CE7", "#2AA6A0", "#B4508E", "#5A7184"];

type P = { x: number; y: number; vx: number; vy: number };

export default function CollabGraph({ nodes, edges, suggestions = [], height = 460 }: { nodes: CollabNode[]; edges: CollabEdge[]; suggestions?: ShouldTalk[]; height?: number }) {
  const n = nodes.length;
  const pos = useRef<P[]>([]);
  const [, setFrame] = useState(0);
  const cx = W / 2, cy = H / 2;

  // Color by organization.
  const orgColor = useRef<Map<string, string>>(new Map());
  if (orgColor.current.size === 0) {
    const orgs = [...new Set(nodes.map((x) => x.org || "—"))];
    orgs.forEach((o, i) => orgColor.current.set(o, PALETTE[i % PALETTE.length]));
  }

  const idIndex = new Map(nodes.map((x, i) => [x.id, i]));
  const suggEdges = suggestions
    .map((s) => ({ a: idIndex.get(s.aId), b: idIndex.get(s.bId) }))
    .filter((e) => e.a != null && e.b != null) as { a: number; b: number }[];

  // Seed positions synchronously so nodes paint on the first render (the physics
  // timer only animates from here; it isn't needed to make nodes appear).
  if (pos.current.length !== n) {
    pos.current = Array.from({ length: n }, (_, i) => {
      const a = (i / Math.max(1, n)) * Math.PI * 2;
      return { x: cx + Math.cos(a) * 150, y: cy + Math.sin(a) * 150, vx: 0, vy: 0 };
    });
  }

  useEffect(() => {
    let frames = 0;
    const id = setInterval(() => {
      const nd = pos.current;
      if (nd.length !== n) return;
      if (++frames > 240) { clearInterval(id); return; }
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let dx = nd[i].x - nd[j].x, dy = nd[i].y - nd[j].y;
          let d2 = dx * dx + dy * dy; if (d2 < 1) d2 = 1;
          const f = 3000 / d2, d = Math.sqrt(d2);
          nd[i].vx += (dx / d) * f; nd[i].vy += (dy / d) * f;
          nd[j].vx -= (dx / d) * f; nd[j].vy -= (dy / d) * f;
        }
      }
      for (const e of edges) {
        const a = nd[e.a], b = nd[e.b]; if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 80) * 0.04;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      }
      for (const p of nd) {
        p.vx += (cx - p.x) * 0.008; p.vy += (cy - p.y) * 0.008;
        p.vx *= 0.8; p.vy *= 0.8;
        p.x += Math.max(-7, Math.min(7, p.vx)); p.y += Math.max(-7, Math.min(7, p.vy));
        p.x = Math.max(30, Math.min(W - 30, p.x)); p.y = Math.max(22, Math.min(H - 22, p.y));
      }
      setFrame((f) => (f + 1) % 100000);
    }, 40);
    return () => clearInterval(id);
  }, [n, edges]); // eslint-disable-line

  const nd = pos.current;
  if (n === 0) return <div className="rounded-xl border border-line bg-mist py-12 text-center text-sm text-slate2">Not enough co-authorship data to draw a network.</div>;

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-line bg-mist">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
          {/* suggested collaborations (dashed) */}
          {suggEdges.map((e, i) => {
            const a = nd[e.a], b = nd[e.b]; if (!a || !b) return null;
            return <line key={`s${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#CE8F2C" strokeWidth={1.5} strokeDasharray="4 4" strokeOpacity={0.8} />;
          })}
          {/* real co-authorships (solid) */}
          {edges.map((e, i) => {
            const a = nd[e.a], b = nd[e.b]; if (!a || !b) return null;
            return <line key={`e${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#7c8a99" strokeWidth={Math.min(4, 1 + e.weight)} strokeOpacity={0.55} />;
          })}
          {/* nodes */}
          {nodes.map((node, i) => {
            const p = nd[i]; if (!p) return null;
            const r = 6 + (node.compot / 100) * 9;
            const first = node.name.trim().split(/\s+/)[0];
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={r} fill={orgColor.current.get(node.org || "—")} fillOpacity={0.92} stroke="#fff" strokeWidth={1.3} />
                <text x={p.x} y={p.y + r + 11} textAnchor="middle" fontSize={11} fill="#334155" style={{ fontWeight: 600 }}>{first}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate2">
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-[#7c8a99]" /> co-authored</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 border-t-2 border-dashed" style={{ borderColor: "#CE8F2C" }} /> suggested collaboration</span>
        <span className="ml-auto">Bigger dot = higher commercial potential · color = institution</span>
      </div>
    </div>
  );
}
