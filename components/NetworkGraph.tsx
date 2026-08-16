"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Net = {
  edges: { s: number; t: number; strong: boolean }[];
  degree: number[];
  indegTop: { name: string; value: number }[];
  betwTop: { name: string; value: number }[];
};
type Data = { n: number; respondents: number; advice: Net; friends: Net };

const W = 760;
const H = 520;

type P = { x: number; y: number; vx: number; vy: number };

export default function NetworkGraph({ cohort, big = false }: { cohort: string; big?: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [view, setView] = useState<"advice" | "friends">("advice");
  const [, setFrame] = useState(0);
  const pos = useRef<P[]>([]);
  const edgesRef = useRef<{ s: number; t: number; strong: boolean }[]>([]);
  const degRef = useRef<number[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/network/graph?cohort=${encodeURIComponent(cohort)}`, {
      cache: "no-store",
    });
    if (res.ok) setData(await res.json());
  }, [cohort]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  // Sync simulation arrays when data or view changes.
  useEffect(() => {
    if (!data) return;
    const n = data.n;
    const arr = pos.current;
    while (arr.length < n) {
      arr.push({
        x: W / 2 + (Math.cos(arr.length) * 60 + (arr.length % 7) * 13 - 40),
        y: H / 2 + (Math.sin(arr.length) * 60 + (arr.length % 5) * 11 - 30),
        vx: 0,
        vy: 0,
      });
    }
    arr.length = n;
    edgesRef.current = data[view].edges;
    degRef.current = data[view].degree;
  }, [data, view]);

  // Physics loop.
  useEffect(() => {
    const id = setInterval(() => {
      const nodes = pos.current;
      const n = nodes.length;
      if (n === 0) return;
      const cx = W / 2;
      const cy = H / 2;
      // repulsion
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let dx = nodes[i].x - nodes[j].x;
          let dy = nodes[i].y - nodes[j].y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) d2 = 1;
          const f = 1400 / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          nodes[i].vx += fx;
          nodes[i].vy += fy;
          nodes[j].vx -= fx;
          nodes[j].vy -= fy;
        }
      }
      // springs
      for (const e of edgesRef.current) {
        const a = nodes[e.s];
        const b = nodes[e.t];
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 70) * 0.02 * (e.strong ? 1.6 : 1);
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      // centering + integrate
      for (const p of nodes) {
        p.vx += (cx - p.x) * 0.006;
        p.vy += (cy - p.y) * 0.006;
        p.vx *= 0.82;
        p.vy *= 0.82;
        p.x += Math.max(-8, Math.min(8, p.vx));
        p.y += Math.max(-8, Math.min(8, p.vy));
        p.x = Math.max(12, Math.min(W - 12, p.x));
        p.y = Math.max(12, Math.min(H - 12, p.y));
      }
      setFrame((f) => (f + 1) % 1000);
    }, 40);
    return () => clearInterval(id);
  }, []);

  if (!data) return <div className="text-slate2">Loading…</div>;

  const net = data[view];
  const nodes = pos.current;
  const maxDeg = Math.max(1, ...(degRef.current || [1]));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-line p-0.5">
          {(["advice", "friends"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                "rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition " +
                (view === v ? "bg-ink text-white" : "text-slate2")
              }
            >
              {v}
            </button>
          ))}
        </div>
        <span className="text-sm text-slate2">
          {data.respondents} responded · {data.n} in the network
        </span>
        <span className="ml-auto flex items-center gap-3 text-xs text-slate2">
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-5" style={{ background: "var(--sage)" }} /> strong (mutual)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-5 border-t border-dashed border-slate-400" /> weak (one-way)
          </span>
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-mist">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: big ? 540 : 380 }}>
          {edgesRef.current.map((e, i) => {
            const a = nodes[e.s];
            const b = nodes[e.t];
            if (!a || !b) return null;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={e.strong ? "var(--sage)" : "#9aa7b4"}
                strokeWidth={e.strong ? 1.6 : 0.8}
                strokeOpacity={e.strong ? 0.7 : 0.4}
                strokeDasharray={e.strong ? undefined : "3 3"}
              />
            );
          })}
          {nodes.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.5 + ((degRef.current[i] || 0) / maxDeg) * 7}
              fill="var(--sky)"
              fillOpacity={0.9}
              stroke="#fff"
              strokeWidth={0.8}
            />
          ))}
        </svg>
      </div>
      <div className="mt-1 text-center text-xs text-slate2">
        Anonymous — bigger dots are named by more people.
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Leaderboard title="Most sought (in-degree)" rows={net.indegTop} />
        <Leaderboard title="Top bridges (betweenness)" rows={net.betwTop} />
      </div>
    </div>
  );
}

function Leaderboard({ title, rows }: { title: string; rows: { name: string; value: number }[] }) {
  return (
    <div className="card p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-sage">{title}</div>
      {rows.length === 0 ? (
        <div className="text-sm text-slate2">—</div>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="text-ink">
                <span className="mr-2 font-semibold text-slate2">{i + 1}.</span>
                {r.name}
              </span>
              <span className="font-semibold text-slate2">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
