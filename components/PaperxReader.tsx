"use client";

import { useState } from "react";
import Link from "next/link";
import LessonPredict from "@/components/lessons/LessonPredict";
import type { PxGenome, PxChart, PxTeachback } from "@/lib/paperx/types";

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
function Chart({ chart }: { chart: PxChart }) {
  const W = 560, H = 240, padL = 44, padR = 20, padT = 16, padB = 34;
  const allY = chart.series.flatMap((s) => s.points.map((p) => p.y));
  const minY = Math.min(0, ...allY), maxY = Math.max(...allY, 1);
  const span = maxY - minY || 1;
  const xs = chart.series[0]?.points.map((p) => p.x) || [];
  const n = Math.max(1, xs.length);
  const xAt = (i: number) => padL + (n === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
  const yAt = (v: number) => padT + (H - padT - padB) * (1 - (v - minY) / span);
  const barGroupW = (W - padL - padR) / n;

  return (
    <figure className="my-6 overflow-hidden rounded-2xl border border-line bg-white p-4">
      <figcaption className="mb-1 text-sm font-semibold text-ink">{chart.title}</figcaption>
      {chart.annotation && <div className="mb-2 inline-block rounded-full bg-mist px-2 py-0.5 text-xs font-bold tabular-nums text-ink">{chart.annotation}</div>}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]" role="img" aria-label={chart.title}>
          {/* baseline / zero line */}
          <line x1={padL} y1={yAt(0)} x2={W - padR} y2={yAt(0)} stroke="#e2e8f0" strokeWidth="1" />
          {chart.yLabel && <text x={12} y={padT + 6} fontSize="11" fill="#94a3b8" transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle">{chart.yLabel}</text>}
          {chart.kind === "bars"
            ? chart.series.map((s, si) => {
                const t = TONE[s.tone || "neutral"];
                const bw = (barGroupW * 0.7) / chart.series.length;
                return s.points.map((p, i) => {
                  const x = padL + i * barGroupW + barGroupW * 0.15 + si * bw;
                  const y = yAt(p.y), y0 = yAt(0);
                  return <rect key={`${si}-${i}`} x={x} y={Math.min(y, y0)} width={bw} height={Math.abs(y0 - y)} rx="2" fill={t.stroke} opacity={0.85} />;
                });
              })
            : chart.series.map((s, si) => {
                const t = TONE[s.tone || "neutral"];
                const pts = s.points.map((p, i) => `${xAt(i)},${yAt(p.y)}`).join(" ");
                return (
                  <g key={si}>
                    <polyline points={pts} fill="none" stroke={t.stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {s.points.map((p, i) => <circle key={i} cx={xAt(i)} cy={yAt(p.y)} r="3.5" fill={t.stroke} />)}
                  </g>
                );
              })}
          {/* x labels */}
          {xs.map((x, i) => <text key={i} x={xAt(i)} y={H - 12} fontSize="11" fill="#64748b" textAnchor="middle">{x}</text>)}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {chart.series.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TONE[s.tone || "neutral"].stroke }} />{s.label}
          </span>
        ))}
      </div>
      {chart.caption && <p className="mt-2 text-xs text-slate-400">{chart.caption}</p>}
    </figure>
  );
}

// ---- Teach-back --------------------------------------------------------------
function TeachBack({ slug, g }: { slug: string; g: PxGenome }) {
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
export default function PaperxReader({ g, preview }: { g: PxGenome; preview?: boolean }) {
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
            <TeachBack slug={g.slug} g={g} />
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
