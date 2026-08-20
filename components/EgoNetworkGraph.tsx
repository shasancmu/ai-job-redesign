"use client";

import { useEffect, useRef, useState } from "react";
import { DOMAINS, domainMeta, hasTie, type Contact, type Ties } from "@/lib/egonet";

// The ego graph: YOU pinned at the center, each contact a node colored by the
// world it lives in and sized by tie strength, with the contact-to-contact ties
// drawn so structural holes (contacts no line reaches across) are visible. A
// small force simulation settles the layout; the ego node stays put.

const W = 720;
const H = 520;

type P = { x: number; y: number; vx: number; vy: number };

export default function EgoNetworkGraph({ contacts, ties, height = 440 }: { contacts: Contact[]; ties: Ties; height?: number }) {
  const alters = contacts.filter((c) => c && c.name && c.name.trim());
  const n = alters.length;
  const pos = useRef<P[]>([]);
  const [, setFrame] = useState(0);
  const cx = W / 2;
  const cy = H / 2;

  // Seed positions radially, grouped by world so it reads well before settling.
  useEffect(() => {
    const arr: P[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n)) * Math.PI * 2;
      arr.push({ x: cx + Math.cos(a) * 150, y: cy + Math.sin(a) * 150, vx: 0, vy: 0 });
    }
    pos.current = arr;
  }, [n]); // eslint-disable-line

  // Physics: ego is fixed at center; alters repel, ego-alter springs pull them
  // to a comfortable ring, contact-to-contact ties pull connected alters closer.
  // The sim stops once the layout has settled so a report page doesn't pin a CPU.
  useEffect(() => {
    let frames = 0;
    const id = setInterval(() => {
      const nodes = pos.current;
      if (nodes.length !== n) return;
      if (++frames > 220) { clearInterval(id); return; }
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let dx = nodes[i].x - nodes[j].x;
          let dy = nodes[i].y - nodes[j].y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) d2 = 1;
          const f = 2600 / d2;
          const d = Math.sqrt(d2);
          nodes[i].vx += (dx / d) * f; nodes[i].vy += (dy / d) * f;
          nodes[j].vx -= (dx / d) * f; nodes[j].vy -= (dy / d) * f;
        }
      }
      // ego spring: hold alters near a ring around the center
      for (let i = 0; i < n; i++) {
        const dx = nodes[i].x - cx;
        const dy = nodes[i].y - cy;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 150) * 0.02;
        nodes[i].vx -= (dx / d) * f; nodes[i].vy -= (dy / d) * f;
      }
      // contact-to-contact springs
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (!hasTie(ties, alters[i].id, alters[j].id)) continue;
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = (d - 90) * 0.03;
          nodes[i].vx += (dx / d) * f; nodes[i].vy += (dy / d) * f;
          nodes[j].vx -= (dx / d) * f; nodes[j].vy -= (dy / d) * f;
        }
      }
      for (const p of nodes) {
        p.vx *= 0.8; p.vy *= 0.8;
        p.x += Math.max(-7, Math.min(7, p.vx));
        p.y += Math.max(-7, Math.min(7, p.vy));
        p.x = Math.max(28, Math.min(W - 28, p.x));
        p.y = Math.max(24, Math.min(H - 24, p.y));
      }
      setFrame((f) => (f + 1) % 100000);
    }, 40);
    return () => clearInterval(id);
  }, [n, ties]); // eslint-disable-line

  const nodes = pos.current;
  if (n === 0) {
    return <div className="rounded-xl border border-line bg-mist py-16 text-center text-sm text-slate2">Add a few contacts to see your network.</div>;
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-line bg-mist">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
          {/* contact-to-contact ties (structure) */}
          {alters.map((a, i) =>
            alters.slice(i + 1).map((b, k) => {
              const j = i + 1 + k;
              if (!hasTie(ties, a.id, b.id)) return null;
              const pa = nodes[i]; const pb = nodes[j];
              if (!pa || !pb) return null;
              return <line key={`t${i}-${j}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#9aa7b4" strokeWidth={1} strokeOpacity={0.5} />;
            })
          )}
          {/* ego → contact spokes */}
          {alters.map((a, i) => {
            const p = nodes[i]; if (!p) return null;
            return <line key={`e${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={domainMeta(a.domain).color} strokeWidth={0.6 + a.strength * 0.7} strokeOpacity={0.28} />;
          })}
          {/* contact nodes */}
          {alters.map((a, i) => {
            const p = nodes[i]; if (!p) return null;
            const r = 6 + a.strength * 3;
            const col = domainMeta(a.domain).color;
            const first = a.name.trim().split(/\s+/)[0];
            return (
              <g key={`n${i}`}>
                {a.energy === "energize" && <circle cx={p.x} cy={p.y} r={r + 3.5} fill="none" stroke="#CE8F2C" strokeWidth={2} />}
                <circle cx={p.x} cy={p.y} r={r} fill={col} fillOpacity={a.energy === "drain" ? 0.35 : 0.92} stroke="#fff" strokeWidth={1.2} />
                <text x={p.x} y={p.y + r + 11} textAnchor="middle" fontSize={11} fill="#334155" style={{ fontWeight: 600 }}>{first}</text>
              </g>
            );
          })}
          {/* ego */}
          <circle cx={cx} cy={cy} r={16} fill="#14283A" stroke="#fff" strokeWidth={2} />
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fill="#fff" style={{ fontWeight: 700 }}>You</text>
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate2">
        {DOMAINS.map((d) => (
          <span key={d.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            {d.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: "#CE8F2C" }} /> energizes you</span>
        <span className="ml-auto">Bigger dot = stronger tie · lines = your contacts who know each other</span>
      </div>
    </div>
  );
}
