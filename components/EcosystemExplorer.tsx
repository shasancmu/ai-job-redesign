"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CollabNode, CollabEdge, ShouldTalk } from "@/lib/domainBrief";

// An INTERACTIVE ecosystem map. Same collaboration network as CollabGraph, but
// you can explore it: click a researcher to see their profile, collaborators,
// and the cross-disciplinary bridges they should build; filter by institution;
// and recolor the whole map by a potential dimension to see where value
// concentrates. Nodes are experts (size = commercial potential), solid links are
// real co-authorships, dashed amber links are suggested collaborations (structural
// holes worth bridging, Burt 1992).

const W = 760;
const H = 540;
const PALETTE = ["#3F7A52", "#3B7FB5", "#CE8F2C", "#C06A47", "#6C5CE7", "#2AA6A0", "#B4508E", "#5A7184"];
type P = { x: number; y: number; vx: number; vy: number };
type ColorBy = "org" | "compot" | "scipot" | "socpot";

const POT_LABEL: Record<Exclude<ColorBy, "org">, string> = { compot: "Commercial", scipot: "Scientific", socpot: "Social" };

// green -> amber -> clay by 0-100 value
function potColor(v: number): string {
  const t = Math.max(0, Math.min(100, v)) / 100;
  const stops = [[192, 106, 71], [206, 143, 44], [63, 122, 82]]; // clay, amber, sage
  const seg = t < 0.5 ? [stops[0], stops[1]] : [stops[1], stops[2]];
  const f = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const c = seg[0].map((a, i) => Math.round(a + (seg[1][i] - a) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export default function EcosystemExplorer({ nodes, edges, suggestions = [], height = 520 }: { nodes: CollabNode[]; edges: CollabEdge[]; suggestions?: ShouldTalk[]; height?: number }) {
  const n = nodes.length;
  const pos = useRef<P[]>([]);
  const [, setFrame] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [orgFilter, setOrgFilter] = useState<string | null>(null);
  const [colorBy, setColorBy] = useState<ColorBy>("org");
  const [onlyBridges, setOnlyBridges] = useState(false);
  const cx = W / 2, cy = H / 2;

  const orgs = useMemo(() => [...new Set(nodes.map((x) => x.org || "—"))], [nodes]);
  const orgColor = useMemo(() => { const m = new Map<string, string>(); orgs.forEach((o, i) => m.set(o, PALETTE[i % PALETTE.length])); return m; }, [orgs]);
  const idIndex = useMemo(() => new Map(nodes.map((x, i) => [x.id, i])), [nodes]);

  const suggEdges = useMemo(() => suggestions
    .map((s) => ({ a: idIndex.get(s.aId), b: idIndex.get(s.bId), s }))
    .filter((e) => e.a != null && e.b != null) as { a: number; b: number; s: ShouldTalk }[], [suggestions, idIndex]);

  // Neighbors of the selected node (co-authors + suggested bridges).
  const neighbors = useMemo(() => {
    if (sel == null) return null;
    const set = new Set<number>([sel]);
    for (const e of edges) { if (e.a === sel) set.add(e.b); if (e.b === sel) set.add(e.a); }
    for (const e of suggEdges) { if (e.a === sel) set.add(e.b); if (e.b === sel) set.add(e.a); }
    return set;
  }, [sel, edges, suggEdges]);

  const selBridges = useMemo(() => sel == null ? [] : suggEdges.filter((e) => e.a === sel || e.b === sel).map((e) => e.s), [sel, suggEdges]);

  if (pos.current.length !== n) {
    pos.current = Array.from({ length: n }, (_, i) => {
      const a = (i / Math.max(1, n)) * Math.PI * 2;
      return { x: cx + Math.cos(a) * 160, y: cy + Math.sin(a) * 160, vx: 0, vy: 0 };
    });
  }

  useEffect(() => {
    let frames = 0;
    const id = setInterval(() => {
      const nd = pos.current;
      if (nd.length !== n) return;
      if (++frames > 260) { clearInterval(id); return; }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        let dx = nd[i].x - nd[j].x, dy = nd[i].y - nd[j].y;
        let d2 = dx * dx + dy * dy; if (d2 < 1) d2 = 1;
        const f = 3200 / d2, d = Math.sqrt(d2);
        nd[i].vx += (dx / d) * f; nd[i].vy += (dy / d) * f;
        nd[j].vx -= (dx / d) * f; nd[j].vy -= (dy / d) * f;
      }
      for (const e of edges) {
        const a = nd[e.a], b = nd[e.b]; if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 82) * 0.04;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f; b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      }
      for (const p of nd) {
        p.vx += (cx - p.x) * 0.008; p.vy += (cy - p.y) * 0.008;
        p.vx *= 0.8; p.vy *= 0.8;
        p.x += Math.max(-7, Math.min(7, p.vx)); p.y += Math.max(-7, Math.min(7, p.vy));
        p.x = Math.max(30, Math.min(W - 30, p.x)); p.y = Math.max(22, Math.min(H - 30, p.y));
      }
      setFrame((f) => (f + 1) % 100000);
    }, 40);
    return () => clearInterval(id);
  }, [n, edges]); // eslint-disable-line

  const nd = pos.current;
  if (n === 0) return <div className="rounded-xl border border-line bg-mist py-12 text-center text-sm text-slate2">Not enough co-authorship data to draw a network.</div>;

  const fillFor = (node: CollabNode) => colorBy === "org" ? (orgColor.get(node.org || "—") || "#5A7184") : potColor((node as any)[colorBy] || 0);
  const dim = (i: number) => {
    if (orgFilter && (nodes[i].org || "—") !== orgFilter) return true;
    if (neighbors && !neighbors.has(i)) return true;
    return false;
  };
  const selNode = sel != null ? nodes[sel] : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* Graph */}
      <div>
        {/* controls */}
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Color by:</span>
          {(["org", "compot", "scipot", "socpot"] as ColorBy[]).map((c) => (
            <button key={c} onClick={() => setColorBy(c)} className={"rounded-full border px-2.5 py-1 " + (colorBy === c ? "border-ai bg-ai/10 text-ink font-semibold" : "border-line text-slate2 hover:bg-mist")}>
              {c === "org" ? "Institution" : POT_LABEL[c]}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-slate2"><input type="checkbox" checked={onlyBridges} onChange={(e) => setOnlyBridges(e.target.checked)} /> only bridges</label>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-mist">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} onClick={() => setSel(null)}>
            {!onlyBridges && edges.map((e, i) => {
              const a = nd[e.a], b = nd[e.b]; if (!a || !b) return null;
              const on = neighbors ? (neighbors.has(e.a) && neighbors.has(e.b) && (e.a === sel || e.b === sel)) : true;
              return <line key={`e${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#7c8a99" strokeWidth={Math.min(4, 1 + e.weight)} strokeOpacity={on ? 0.7 : 0.12} />;
            })}
            {suggEdges.map((e, i) => {
              const a = nd[e.a], b = nd[e.b]; if (!a || !b) return null;
              const on = neighbors ? (e.a === sel || e.b === sel) : true;
              return <line key={`s${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#CE8F2C" strokeWidth={1.6} strokeDasharray="4 4" strokeOpacity={on ? 0.95 : 0.2} />;
            })}
            {nodes.map((node, i) => {
              const p = nd[i]; if (!p) return null;
              const r = 6 + (node.compot / 100) * 9;
              const isSel = i === sel;
              const faded = dim(i);
              const first = node.name.trim().split(/\s+/)[0];
              return (
                <g key={i} opacity={faded ? 0.18 : 1} style={{ cursor: "pointer" }}
                   onClick={(ev) => { ev.stopPropagation(); setSel(i === sel ? null : i); }}>
                  <circle cx={p.x} cy={p.y} r={isSel ? r + 3 : r} fill={fillFor(node)} fillOpacity={0.92} stroke={isSel ? "#111827" : "#fff"} strokeWidth={isSel ? 2.5 : 1.3} />
                  {(isSel || n <= 40) && <text x={p.x} y={p.y + r + 11} textAnchor="middle" fontSize={11} fill="#334155" style={{ fontWeight: 600 }}>{first}</text>}
                </g>
              );
            })}
          </svg>
        </div>

        {/* legend / org filter */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate2">
          {colorBy === "org" ? orgs.slice(0, 8).map((o) => (
            <button key={o} onClick={() => setOrgFilter(orgFilter === o ? null : o)} className={"flex items-center gap-1.5 rounded-full px-2 py-0.5 " + (orgFilter === o ? "bg-ink/5 font-semibold text-ink" : "hover:bg-mist")}>
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: orgColor.get(o) }} /> {o.length > 22 ? o.slice(0, 21) + "…" : o}
            </button>
          )) : (
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-16 rounded-full" style={{ background: "linear-gradient(90deg,#C06A47,#CE8F2C,#3F7A52)" }} /> low → high {POT_LABEL[colorBy]} potential</span>
          )}
          <span className="ml-auto">Click a researcher to explore · dashed = suggested collaboration</span>
        </div>
      </div>

      {/* Detail panel */}
      <div className="rounded-xl border border-line bg-white p-4">
        {!selNode ? (
          <div className="text-sm text-slate2">
            <div className="font-semibold text-ink">Explore the ecosystem</div>
            <p className="mt-2">Click any researcher to see their profile, who they work with, and the <span className="font-medium text-amber">cross-disciplinary bridges</span> they could build. Recolor the map by potential to see where value concentrates.</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-mist p-2"><div className="text-lg font-bold text-ink">{n}</div>experts</div>
              <div className="rounded-lg bg-mist p-2"><div className="text-lg font-bold text-ink">{edges.length}</div>collaborations</div>
              <div className="rounded-lg bg-mist p-2"><div className="text-lg font-bold text-amber">{suggEdges.length}</div>bridges</div>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-ink">{selNode.name}</div>
                <div className="text-xs text-slate2">{selNode.org || "—"}</div>
              </div>
              <button onClick={() => setSel(null)} className="text-xs text-slate-400 hover:text-ink">✕</button>
            </div>
            <div className="mt-3 space-y-1.5">
              {(["compot", "scipot", "socpot"] as const).map((k) => {
                const v = Math.round((selNode as any)[k] || 0);
                return (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-[11px] uppercase tracking-wide text-slate-400">{POT_LABEL[k]}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full" style={{ width: `${v}%`, background: potColor(v) }} /></div>
                    <span className="w-7 text-right text-xs tabular-nums text-slate2">{v}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-slate2">{selNode.degree} collaborator{selNode.degree === 1 ? "" : "s"} in this ecosystem</div>
            {selBridges.length > 0 && (
              <div className="mt-3 border-t border-line pt-3">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber">Should collaborate with</div>
                <ul className="space-y-1.5">
                  {selBridges.slice(0, 5).map((b, i) => {
                    const other = b.aId === selNode.id ? b.bName : b.aName;
                    return <li key={i} className="text-xs"><span className="font-semibold text-ink">{other}</span>{b.sharedTopics?.length ? <span className="text-slate2"> — {b.sharedTopics.slice(0, 3).join(", ")}</span> : null}</li>;
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
