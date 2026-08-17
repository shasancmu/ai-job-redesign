"use client";

import { useMemo, useState } from "react";

const TIER = {
  lateral: { c: "#3B7FB5", label: "Lateral pivot", soft: "#E6F0F8" },
  step_up: { c: "#3F7A52", label: "Step up", soft: "#E7F1EA" },
  stretch: { c: "#CE8F2C", label: "Stretch move", soft: "#FaF1DF" },
} as const;
type Tier = keyof typeof TIER;
const tierOf = (t: string): Tier => (t in TIER ? (t as Tier) : "lateral");

export default function CareerRoadmapView({ roadmap }: { roadmap: any }) {
  const targets: any[] = roadmap?.targets || [];
  const [sel, setSel] = useState<string>(targets[0]?.code || "");
  const target = targets.find((t) => t.code === sel) || targets[0];

  if (!target) return <p className="text-sm text-slate2">No roadmap yet.</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your starting point</div>
        <h2 className="mt-0.5 text-xl font-bold text-ink">{roadmap.current?.title}</h2>
        {roadmap.strengths?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {roadmap.strengths.map((s: string, i: number) => (
              <span key={i} className="rounded-full bg-mist px-2.5 py-0.5 text-xs text-slate-600">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Career map */}
      <div className="card p-5">
        <div className="mb-1 text-sm font-bold text-ink">Where you can go next</div>
        <p className="mb-3 text-xs text-slate-400">
          Positioned by how transferable your skills are (right = closer) and the upside (up = higher pay, or prep level). Tap a role.
        </p>
        <CareerMap roadmap={roadmap} sel={sel} onSelect={setSel} />
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          {(Object.keys(TIER) as Tier[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: TIER[k].c }} />
              {TIER[k].label}
            </span>
          ))}
        </div>
      </div>

      {/* Selected target: radar + gaps */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: TIER[tierOf(target.tier)].soft, color: TIER[tierOf(target.tier)].c }}
            >
              {TIER[tierOf(target.tier)].label}
            </span>
            <h3 className="mt-1.5 text-lg font-bold text-ink">{target.title}</h3>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Skill match {Math.round(target.sim * 100)}%</div>
            {target.wage != null ? (
              <div>
                ${Math.round(target.wage / 1000)}k median
                {roadmap.current?.wage != null && (
                  <span className={target.wage >= roadmap.current.wage ? "text-sage" : "text-clay"}>
                    {" "}({target.wage >= roadmap.current.wage ? "+" : ""}
                    {Math.round((target.wage - roadmap.current.wage) / 1000)}k)
                  </span>
                )}
              </div>
            ) : (
              target.zone != null && <div>Job Zone {target.zone}</div>
            )}
          </div>
        </div>
        {target.why && <p className="mt-2 text-sm leading-relaxed text-slate2">{target.why}</p>}

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">You vs. this role</div>
            <Radar points={target.radar || []} />
            <div className="mt-1 flex justify-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "#3B7FB5" }} /> You</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: "#1c1c1a" }} /> {target.title}</span>
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Skills to build</div>
            <div className="space-y-2.5">
              {(target.gaps || []).filter((g: any) => g.gap > 0.2).slice(0, 5).map((g: any, i: number) => (
                <GapBar key={i} gap={g} />
              ))}
              {(target.gaps || []).filter((g: any) => g.gap > 0.2).length === 0 && (
                <p className="text-sm text-slate2">You already meet this role's skill bar — the move is about positioning, not upskilling.</p>
              )}
            </div>
            {target.skillsToBuild?.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                {target.skillsToBuild.map((s: any, i: number) => (
                  <div key={i} className="text-xs">
                    <span className="font-semibold text-ink">{s.skill}</span>
                    <span className="text-slate2"> — {s.how}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Roadmap timeline */}
      <div className="card p-5">
        <div className="mb-3 text-sm font-bold text-ink">Your roadmap</div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { k: "near", label: "Next 0–3 months", dot: "#3B7FB5" },
            { k: "mid", label: "3–12 months", dot: "#3F7A52" },
            { k: "move", label: "12–24 months — the move", dot: "#CE8F2C" },
          ].map((col) => (
            <div key={col.k}>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
                <span className="text-xs font-semibold text-ink">{col.label}</span>
              </div>
              <ul className="space-y-1.5">
                {(roadmap.plan?.[col.k] || []).map((item: string, i: number) => (
                  <li key={i} className="text-sm leading-relaxed text-slate2">• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {roadmap.note && (
          <div className="mt-4 rounded-lg bg-mist px-3 py-2 text-sm text-slate-600">
            <span className="font-semibold">The lever:</span> {roadmap.note}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Career map (scatter: transferability × preparation) -------------------
function CareerMap({ roadmap, sel, onSelect }: { roadmap: any; sel: string; onSelect: (c: string) => void }) {
  const W = 640, H = 340, padL = 46, padR = 20, padT = 20, padB = 40;
  const pts: any[] = roadmap.map || [];
  const curWage = roadmap.current?.wage ?? null;
  const curZone = roadmap.current?.zone ?? 3;

  const sims = pts.map((p) => p.sim);
  const simMin = Math.min(...sims, 0.6) - 0.02;
  const simMax = Math.max(...sims, 1) + 0.02;
  const x = (sim: number) => padL + ((sim - simMin) / (simMax - simMin)) * (W - padL - padR);

  // Upside axis: real median pay when we have it, else Job Zone.
  const useWage = curWage != null && pts.some((p) => p.wage != null);
  const wages = [curWage, ...pts.map((p) => p.wage)].filter((w) => w != null) as number[];
  const wMin = Math.min(...wages), wMax = Math.max(...wages);
  const plot = (H - padT - padB);
  const yWage = (w: number | null) => H - padB - (((w ?? wMin) - wMin) / ((wMax - wMin) || 1)) * plot;
  const yZone = (z: number | null) => H - padB - (((z ?? 3) - 1) / 4) * plot;
  const y = (p: { wage: number | null; zone: number | null }) => (useWage ? yWage(p.wage) : yZone(p.zone));
  const k = (w: number) => "$" + Math.round(w / 1000) + "k";

  const wLines = useWage
    ? [0, 0.25, 0.5, 0.75, 1].map((f) => wMin + f * (wMax - wMin))
    : [];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 480 }} role="img" aria-label="Career map">
        {/* upside gridlines */}
        {useWage
          ? wLines.map((w, i) => (
              <g key={i}>
                <line x1={padL} x2={W - padR} y1={yWage(w)} y2={yWage(w)} stroke="#eee" />
                <text x={6} y={yWage(w) + 3} fontSize="9" fill="#94a3b8">{k(w)}</text>
              </g>
            ))
          : [1, 2, 3, 4, 5].map((z) => (
              <g key={z}>
                <line x1={padL} x2={W - padR} y1={yZone(z)} y2={yZone(z)} stroke="#eee" />
                <text x={6} y={yZone(z) + 3} fontSize="9" fill="#94a3b8">Z{z}</text>
              </g>
            ))}
        <text x={W / 2} y={H - 6} fontSize="10" fill="#94a3b8" textAnchor="middle">Skill transferability →</text>
        <text x={12} y={14} fontSize="9" fill="#94a3b8">{useWage ? "Median pay ↑" : "Prep level ↑"}</text>

        {/* candidates */}
        {pts.map((p) => {
          const t = p.tier ? TIER[tierOf(p.tier)] : null;
          const isSel = p.code === sel;
          const r = p.selected ? (isSel ? 9 : 7) : 4;
          return (
            <g key={p.code} onClick={() => p.selected && onSelect(p.code)} style={{ cursor: p.selected ? "pointer" : "default" }}>
              <circle
                cx={x(p.sim)} cy={y(p)} r={r}
                fill={t ? t.c : "#cbd5e1"}
                opacity={p.selected ? 1 : 0.5}
                stroke={isSel ? "#1c1c1a" : "white"} strokeWidth={isSel ? 2 : 1}
              />
              {p.selected && (
                <text x={x(p.sim)} y={y(p) - r - 4} fontSize="10" fill="#1c1c1a" textAnchor="middle" fontWeight={isSel ? 700 : 500}>
                  {p.title.length > 26 ? p.title.slice(0, 24) + "…" : p.title}
                </text>
              )}
            </g>
          );
        })}

        {/* "You" anchor at far right */}
        <g>
          <circle cx={x(simMax)} cy={y({ wage: curWage, zone: curZone })} r={7} fill="white" stroke="#1c1c1a" strokeWidth={2.5} />
          <circle cx={x(simMax)} cy={y({ wage: curWage, zone: curZone })} r={2.5} fill="#1c1c1a" />
          <text x={x(simMax)} y={y({ wage: curWage, zone: curZone }) + 20} fontSize="10" fill="#1c1c1a" textAnchor="end" fontWeight={700}>You</text>
        </g>
      </svg>
    </div>
  );
}

// ---- Skills radar ----------------------------------------------------------
function Radar({ points }: { points: { skill: string; you: number; target: number }[] }) {
  const S = 260, c = S / 2, R = S / 2 - 46, MAX = 7;
  const n = points.length;
  if (n < 3) return <div className="text-xs text-slate-400">Not enough skill data to chart.</div>;
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, v: number) => [c + Math.cos(ang(i)) * R * (v / MAX), c + Math.sin(ang(i)) * R * (v / MAX)];
  const poly = (key: "you" | "target") => points.map((p, i) => pt(i, p[key]).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto w-full" style={{ maxWidth: 300 }} role="img" aria-label="Skills radar">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={points.map((_, i) => pt(i, MAX * f).join(",")).join(" ")} fill="none" stroke="#eee" />
      ))}
      {points.map((_, i) => {
        const [ex, ey] = pt(i, MAX);
        return <line key={i} x1={c} y1={c} x2={ex} y2={ey} stroke="#eee" />;
      })}
      <polygon points={poly("target")} fill="none" stroke="#1c1c1a" strokeWidth={1.5} strokeDasharray="3 2" />
      <polygon points={poly("you")} fill="#3B7FB5" fillOpacity={0.18} stroke="#3B7FB5" strokeWidth={1.5} />
      {points.map((p, i) => {
        const [lx, ly] = pt(i, MAX * 1.16);
        const short = p.skill.split(" ")[0];
        return <text key={i} x={lx} y={ly + 3} fontSize="8.5" fill="#64748b" textAnchor="middle">{short}</text>;
      })}
    </svg>
  );
}

// ---- Gap bar ---------------------------------------------------------------
function GapBar({ gap }: { gap: { name: string; you: number; target: number; gap: number } }) {
  const pct = (v: number) => `${(v / 7) * 100}%`;
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-xs">
        <span className="text-ink">{gap.name}</span>
        <span className="text-slate-400">{gap.you} → {gap.target}</span>
      </div>
      <div className="relative h-2 rounded-full bg-slate-100">
        <div className="absolute inset-y-0 left-0 rounded-full bg-slate-300" style={{ width: pct(gap.you) }} />
        <div className="absolute inset-y-0 rounded-full bg-amber-400/70" style={{ left: pct(gap.you), width: pct(gap.gap) }} />
      </div>
    </div>
  );
}
