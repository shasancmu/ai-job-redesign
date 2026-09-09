"use client";

import { useState } from "react";
import Link from "next/link";
import LessonPredict from "@/components/lessons/LessonPredict";
import type { PxGenome, PxChart, PxSeries, PxTeachback } from "@/lib/paperx/types";

// The interactive, visual reader for a Paper Explainer. A guided vertical
// narrative: hook → the null everyone believes → predict → the puzzle → the
// evidence (a drawn chart) → the idea as an interaction → the mechanism → so
// what → a teach-back the AI grades. Entertaining, visual, and built to leave
// the reader able to EXPLAIN the idea.

const TONE = {
  up: { stroke: "#3F7A52", fill: "rgba(63,122,82,0.12)", chip: "text-sage" },
  down: { stroke: "#C0603A", fill: "rgba(192,96,58,0.12)", chip: "text-clay" },
  neutral: { stroke: "#4E79C9", fill: "rgba(78,121,201,0.12)", chip: "text-sky" },
} as const;

function Section({ eyebrow, children }: { eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
      {eyebrow && <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</div>}
      {children}
    </section>
  );
}

// ---- Inline SVG chart --------------------------------------------------------
const col = (s: PxSeries) => TONE[s.tone || "neutral"].stroke;
const fillOf = (s: PxSeries) => TONE[s.tone || "neutral"].fill;
const GRID = "#e2e8f0", AXIS = "#64748b", FAINT = "#94a3b8";
// Least-squares fit for a scatter trend line.
function fit(pts: { x: number; y: number }[]) {
  const n = pts.length; if (n < 2) return null;
  const sx = pts.reduce((a, p) => a + p.x, 0), sy = pts.reduce((a, p) => a + p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0), sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const d = n * sxx - sx * sx; if (!d) return null;
  const m = (n * sxy - sx * sy) / d; return { m, b: (sy - m * sx) / n };
}

function Chart({ chart }: { chart: PxChart }) {
  const W = 560, H = 250, padT = 16, padB = 36;
  const kind = chart.kind;
  const series = chart.series;
  const s0 = series[0];
  const cats = s0?.points.map((p) => p.x) || [];
  const nCat = Math.max(1, cats.length);
  const horizontal = kind === "hbars" || kind === "coef";
  const padL = horizontal ? 108 : 46, padR = 18;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  // Value domain (y for vertical, x for horizontal/scatter).
  let vMin: number, vMax: number;
  if (kind === "scatter") {
    const ys = series.flatMap((s) => s.points.map((p) => p.y));
    vMin = Math.min(...ys); vMax = Math.max(...ys);
  } else if (kind === "coef") {
    const vals = series.flatMap((s) => s.points.flatMap((p) => [p.y, p.lo ?? p.y, p.hi ?? p.y]));
    vMin = Math.min(0, ...vals); vMax = Math.max(0, ...vals);
  } else if (kind === "stacked") {
    const sums = cats.map((_, i) => series.reduce((a, s) => a + (s.points[i]?.y || 0), 0));
    vMin = 0; vMax = Math.max(1, ...sums);
  } else {
    const ys = series.flatMap((s) => s.points.map((p) => p.y));
    vMin = Math.min(0, ...ys); vMax = Math.max(1, ...ys);
  }
  if (vMin === vMax) vMax = vMin + 1;
  const pad = (vMax - vMin) * 0.08; vMin -= (kind === "scatter" ? pad : 0); vMax += pad;
  const vSpan = vMax - vMin || 1;

  // scatter x domain
  const sx = series.flatMap((s) => s.points.map((p) => parseFloat(p.x))).filter((v) => Number.isFinite(v));
  let xMin = Math.min(...(sx.length ? sx : [0])), xMax = Math.max(...(sx.length ? sx : [1]));
  if (xMin === xMax) xMax = xMin + 1;
  const xpad = (xMax - xMin) * 0.08; xMin -= xpad; xMax += xpad;

  // Scales.
  const vToX = (v: number) => padL + plotW * ((v - vMin) / vSpan); // horizontal value axis
  const vToY = (v: number) => padT + plotH * (1 - (v - vMin) / vSpan); // vertical value axis
  const catX = (i: number) => padL + (nCat === 1 ? plotW / 2 : (i * plotW) / (nCat - 1));
  const catY = (i: number) => padT + plotH * ((i + 0.5) / nCat); // horizontal category rows
  const scX = (v: number) => padL + plotW * ((v - xMin) / (xMax - xMin));
  const bandW = plotW / nCat;

  return (
    <figure className="my-6 overflow-hidden rounded-2xl border border-line bg-white p-4">
      <figcaption className="mb-1 text-sm font-semibold text-ink">{chart.title}</figcaption>
      {chart.annotation && <div className="mb-2 inline-block rounded-full bg-mist px-2 py-0.5 text-xs font-bold tabular-nums text-ink">{chart.annotation}</div>}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[440px]" role="img" aria-label={chart.title}>
          {chart.yLabel && !horizontal && <text x={12} y={H / 2} fontSize="11" fill={FAINT} transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle">{chart.yLabel}</text>}
          {chart.xLabel && <text x={padL + plotW / 2} y={H - 4} fontSize="11" fill={FAINT} textAnchor="middle">{chart.xLabel}</text>}

          {/* ---- vertical value charts: bars / stacked / line / area / slope ---- */}
          {["bars", "stacked", "line", "area", "slope"].includes(kind) && <>
            <line x1={padL} y1={vToY(Math.max(vMin, 0))} x2={W - padR} y2={vToY(Math.max(vMin, 0))} stroke={GRID} />
            {kind === "stacked"
              ? cats.map((_, i) => { let acc = 0; return series.map((s, si) => { const v = s.points[i]?.y || 0; const y1 = vToY(acc + v), y0 = vToY(acc); acc += v; return <rect key={`${si}-${i}`} x={padL + i * bandW + bandW * 0.2} y={y1} width={bandW * 0.6} height={Math.max(0, y0 - y1)} fill={col(s)} opacity={0.85} rx="1.5" />; }); })
              : kind === "bars"
                ? series.map((s, si) => { const bw = (bandW * 0.68) / series.length; return s.points.map((p, i) => { const y = vToY(p.y), y0 = vToY(Math.max(vMin, 0)); return <rect key={`${si}-${i}`} x={padL + i * bandW + bandW * 0.16 + si * bw} y={Math.min(y, y0)} width={bw} height={Math.abs(y0 - y)} rx="2" fill={col(s)} opacity={0.85} />; }); })
                : series.map((s, si) => { const pts = s.points.map((p, i) => `${catX(i)},${vToY(p.y)}`).join(" "); const area = `${padL},${vToY(Math.max(vMin, 0))} ${pts} ${catX(s.points.length - 1)},${vToY(Math.max(vMin, 0))}`;
                    return <g key={si}>{kind === "area" && <polygon points={area} fill={fillOf(s)} />}<polyline points={pts} fill="none" stroke={col(s)} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{s.points.map((p, i) => <circle key={i} cx={catX(i)} cy={vToY(p.y)} r="3.5" fill={col(s)} />)}</g>; })}
            {cats.map((x, i) => <text key={i} x={catX(i)} y={H - 18} fontSize="11" fill={AXIS} textAnchor="middle">{x}</text>)}
          </>}

          {/* ---- scatter ---- */}
          {kind === "scatter" && <>
            <line x1={padL} y1={vToY(Math.max(vMin, 0))} x2={W - padR} y2={vToY(Math.max(vMin, 0))} stroke={GRID} />
            {series.map((s, si) => {
              const pts = s.points.map((p) => ({ x: parseFloat(p.x), y: p.y })).filter((p) => Number.isFinite(p.x));
              const line = s.trend ? fit(pts) : null;
              return <g key={si}>
                {line && <line x1={scX(xMin)} y1={vToY(line.m * xMin + line.b)} x2={scX(xMax)} y2={vToY(line.m * xMax + line.b)} stroke={col(s)} strokeWidth="2" strokeDasharray="5 4" opacity={0.7} />}
                {pts.map((p, i) => <circle key={i} cx={scX(p.x)} cy={vToY(p.y)} r="4" fill={col(s)} opacity={0.8} />)}
              </g>;
            })}
            {[xMin + (xMax - xMin) * 0.05, (xMin + xMax) / 2, xMax - (xMax - xMin) * 0.05].map((v, i) => <text key={i} x={scX(v)} y={H - 18} fontSize="10" fill={AXIS} textAnchor="middle">{Math.round(v * 100) / 100}</text>)}
          </>}

          {/* ---- horizontal bars ---- */}
          {kind === "hbars" && <>
            <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={GRID} />
            {(s0?.points || []).map((p, i) => { const y = padT + plotH * ((i + 0.5) / nCat); const bh = Math.min(22, (plotH / nCat) * 0.6); const x2 = vToX(p.y);
              return <g key={i}><rect x={padL} y={y - bh / 2} width={Math.max(0, x2 - padL)} height={bh} rx="2" fill={col(s0)} opacity={0.85} /><text x={padL - 6} y={y + 3} fontSize="11" fill={AXIS} textAnchor="end">{p.x.length > 18 ? p.x.slice(0, 17) + "…" : p.x}</text><text x={x2 + 4} y={y + 3} fontSize="10" fill={FAINT}>{p.y}</text></g>; })}
          </>}

          {/* ---- coefficient / forest plot ---- */}
          {kind === "coef" && <>
            <line x1={vToX(0)} y1={padT} x2={vToX(0)} y2={padT + plotH} stroke={GRID} strokeDasharray="3 3" />
            {(s0?.points || []).map((p, i) => { const y = catY(i); const lo = p.lo ?? p.y, hi = p.hi ?? p.y; const crosses = lo <= 0 && hi >= 0;
              const c = crosses ? "#94a3b8" : col(s0);
              return <g key={i}><text x={padL - 8} y={y + 3} fontSize="11" fill={AXIS} textAnchor="end">{p.x.length > 20 ? p.x.slice(0, 19) + "…" : p.x}</text><line x1={vToX(lo)} y1={y} x2={vToX(hi)} y2={y} stroke={c} strokeWidth="2" /><line x1={vToX(lo)} y1={y - 4} x2={vToX(lo)} y2={y + 4} stroke={c} strokeWidth="1.5" /><line x1={vToX(hi)} y1={y - 4} x2={vToX(hi)} y2={y + 4} stroke={c} strokeWidth="1.5" /><circle cx={vToX(p.y)} cy={y} r="4" fill={c} /></g>; })}
            {[vMin + (vMax - vMin) * 0.05, 0, vMax - (vMax - vMin) * 0.05].map((v, i) => <text key={i} x={vToX(v)} y={H - 18} fontSize="10" fill={AXIS} textAnchor="middle">{Math.round(v * 100) / 100}</text>)}
          </>}
        </svg>
      </div>
      {series.length > 1 && kind !== "hbars" && kind !== "coef" && (
        <div className="mt-2 flex flex-wrap gap-3">
          {series.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs text-slate-500"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: col(s) }} />{s.label}{s.trend ? " (trend)" : ""}</span>
          ))}
        </div>
      )}
      {chart.caption && <p className="mt-2 text-xs text-slate-400">{chart.caption}</p>}
    </figure>
  );
}

// ---- Teach-back --------------------------------------------------------------
function TeachBack({ slug, g, cohort, preview }: { slug: string; g: PxGenome; cohort?: string | null; preview?: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<PxTeachback | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/paperx/teachback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, attempt: text }) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Couldn't evaluate that."); setBusy(false); return; }
      setRes(j);
      // Reaching the teach-back is completion. Record it with the score (not while previewing a draft).
      if (!preview) fetch("/api/paperx/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, cohort, score: j.score, verdict: j.verdict }) }).catch(() => {});
    } catch { setErr("Couldn't reach the grader."); }
    setBusy(false);
  }

  const scoreColor = res ? (res.score >= 75 ? "#3F7A52" : res.score >= 50 ? "#B07A1E" : "#C0603A") : "#64748b";

  return (
    <div className="rounded-2xl border-2 border-sage/40 bg-gradient-to-br from-white to-sage/5 p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sage">The real test</div>
      <h2 className="mt-1 text-xl font-bold text-ink">Now explain it</h2>
      <p className="mt-1 text-sm text-slate-600">{g.teachBack.prompt.replace("<audience>", g.teachBack.audience)}</p>
      <p className="mt-2 text-xs text-slate-400">A good explanation hits: {g.teachBack.rubric.join(" · ")}</p>
      <textarea
        value={text} onChange={(e) => setText(e.target.value)} rows={5} disabled={!!res}
        placeholder={`Explain it to ${g.teachBack.audience}, in your own words…`}
        className="field mt-3 w-full text-sm"
      />
      {err && <p className="mt-2 text-sm text-clay">{err}</p>}
      {!res ? (
        <button onClick={submit} disabled={busy || text.trim().length < 12} className="btn-primary mt-3 text-sm disabled:opacity-40">{busy ? "Reading your explanation…" : "Get feedback →"}</button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold tabular-nums" style={{ color: scoreColor }}>{res.score}</div>
            <div className="text-sm text-slate-600">{res.verdict}</div>
          </div>
          {res.strengths.length > 0 && <div className="rounded-xl bg-sage-soft/50 p-3 text-sm text-ink"><b className="text-sage">What landed:</b> {res.strengths.join(" ")}</div>}
          {res.gaps.length > 0 && <div className="rounded-xl bg-amber-soft/40 p-3 text-sm text-ink"><b className="text-amber">Still fuzzy:</b> {res.gaps.join(" ")}</div>}
          {res.model && <div className="rounded-xl border border-line bg-white p-3 text-sm text-slate-700"><b className="text-ink">A model explanation:</b> {res.model}</div>}
          <button onClick={() => { setRes(null); setText(""); }} className="text-sm text-slate2 underline hover:text-ink">Try again</button>
        </div>
      )}
    </div>
  );
}

// ---- The reader --------------------------------------------------------------
export default function PaperxReader({ g, preview, cohort }: { g: PxGenome; preview?: boolean; cohort?: string | null }) {
  const [started, setStarted] = useState(false);

  return (
    <main className="min-h-[100dvh] bg-paper text-ink">
      {preview && <div className="bg-amber-soft px-4 py-2 text-center text-xs font-medium text-amber">Preview — verify the facts against the paper before publishing.</div>}

      {/* Hero */}
      <div className="mx-auto max-w-2xl px-5 pt-12 pb-6 sm:pt-20">
        <div className="text-4xl" aria-hidden>{g.emoji}</div>
        <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{g.eyebrow}</div>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-ink sm:text-4xl">{g.title}</h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-600">{g.dek}</p>
        <div className="mt-4 rounded-xl border border-line bg-white/60 p-3 text-xs text-slate-500">
          <span className="font-semibold text-slate-600">The paper:</span> {g.paperTitle}{g.authors ? ` — ${g.authors}` : ""}{g.venue ? ` · ${g.venue}` : ""}
        </div>
        {!started && (
          <button onClick={() => setStarted(true)} className="btn-primary mt-6">Start the explainer →</button>
        )}
      </div>

      {(started || preview) && (
        <div className="animate-in fade-in duration-500">
          {/* The big question */}
          <Section eyebrow="The question">
            <p className="text-2xl font-bold leading-snug text-ink">{g.bigQuestion}</p>
          </Section>

          {/* Hook */}
          <Section eyebrow="Why it matters">
            <h2 className="text-xl font-bold text-ink">{g.hook.headline}</h2>
            <p className="mt-2 leading-relaxed text-slate-700">{g.hook.body}</p>
          </Section>

          {/* The null everyone believes */}
          <Section eyebrow="What everyone assumes">
            <h2 className="text-xl font-bold text-ink">{g.nullBelief.headline}</h2>
            <p className="mt-2 leading-relaxed text-slate-700">{g.nullBelief.body}</p>
          </Section>

          {/* Predict-then-reveal */}
          {g.predicts.length > 0 && (
            <Section eyebrow="Take a guess">
              {g.predicts.map((p, i) => (
                <LessonPredict key={i} prompt={p.prompt} choices={p.choices} answer={p.answer} reveal={p.reveal} />
              ))}
            </Section>
          )}

          {/* The puzzle — a violated expectation */}
          <Section eyebrow="The puzzle">
            <div className="space-y-2">
              <div className="rounded-xl border border-line bg-white p-3"><span className="text-[11px] font-semibold uppercase tracking-wide text-sky">We believe</span><p className="mt-0.5 text-ink">{g.puzzle.believe}</p></div>
              <div className="rounded-xl border border-line bg-white p-3"><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">So we'd expect</span><p className="mt-0.5 text-slate-600">{g.puzzle.expect}</p></div>
              <div className="rounded-xl border-2 border-clay/40 bg-clay-soft/30 p-3"><span className="text-[11px] font-semibold uppercase tracking-wide text-clay">But we observe</span><p className="mt-0.5 font-semibold text-ink">{g.puzzle.observe}</p></div>
            </div>
          </Section>

          {/* Evidence + chart */}
          <Section eyebrow="The evidence">
            <h2 className="text-xl font-bold text-ink">{g.evidence.headline}</h2>
            {g.evidence.chart && <Chart chart={g.evidence.chart} />}
            <p className="mt-2 leading-relaxed text-slate-700">{g.evidence.takeaway}</p>
          </Section>

          {/* The idea as an interaction */}
          <Section eyebrow="The idea">
            <p className="mb-4 text-sm text-slate-500">Every research idea is really a conditional relationship. Here is this one:</p>
            <div className="space-y-2">
              <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-3"><span className="flex-none rounded-md bg-ink px-2 py-1 text-[11px] font-bold text-white">IF</span><p className="text-ink">{g.idea.if_}</p></div>
              <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-3"><span className="flex-none rounded-md bg-sage px-2 py-1 text-[11px] font-bold text-white">THEN</span><p className="text-ink">{g.idea.then_}</p></div>
              <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-3"><span className="flex-none rounded-md bg-sky px-2 py-1 text-[11px] font-bold text-white">WHEN</span><p className="text-ink">{g.idea.whenZ}</p></div>
              <div className="flex items-start gap-3 rounded-xl border-2 border-amber/40 bg-amber-soft/30 p-3"><span className="flex-none rounded-md bg-amber px-2 py-1 text-[11px] font-bold text-white">BECAUSE</span><p className="font-medium text-ink">{g.idea.because}</p></div>
            </div>
          </Section>

          {/* Mechanism */}
          <Section eyebrow="Why it happens">
            <h2 className="text-xl font-bold text-ink">{g.mechanism.headline}</h2>
            <p className="mt-2 leading-relaxed text-slate-700">{g.mechanism.body}</p>
          </Section>

          {/* So what */}
          <Section eyebrow="So what">
            <h2 className="text-xl font-bold text-ink">{g.soWhat.headline}</h2>
            <p className="mt-2 leading-relaxed text-slate-700">{g.soWhat.body}</p>
          </Section>

          {/* Teach-back */}
          <Section eyebrow="Your turn">
            <TeachBack slug={g.slug} g={g} cohort={cohort} preview={preview} />
          </Section>

          {/* Glossary + close */}
          {g.glossary && g.glossary.length > 0 && (
            <Section eyebrow="Plain-language glossary">
              <dl className="space-y-2">
                {g.glossary.map((gl, i) => (
                  <div key={i} className="rounded-xl border border-line bg-white p-3">
                    <dt className="text-sm font-semibold text-ink">{gl.term}</dt>
                    <dd className="mt-0.5 text-sm text-slate-600">{gl.def}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          <Section>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard" className="btn-primary">Back to dashboard</Link>
              <button onClick={() => { setStarted(false); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-sm text-slate2 hover:text-ink">Read it again</button>
            </div>
          </Section>
        </div>
      )}
    </main>
  );
}
