"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { accentColor, scoreColor, type CanvasDef } from "@/lib/canvases";
import FrontierPlot, { complexityLevel } from "@/components/FrontierPlot";
import UnitEconomics from "@/components/UnitEconomics";

const SAGE = "#3F7A52";
const GOLD = "#CE8F2C";

export default function CanvasView({
  def,
  canvas,
  code,
  embedded = false,
}: {
  def: CanvasDef;
  canvas: any;
  code?: string;
  embedded?: boolean;
}) {
  const fields: Record<string, any> = canvas.fields || {};
  const groups = Array.from(new Set(def.fields.map((f) => f.group)));
  const hasScore = def.hasScore && typeof canvas.score === "number";

  return (
    <main className={embedded ? "" : "min-h-screen"}>
      {/* Hero */}
      <section className={"relative overflow-hidden " + (embedded ? "rounded-2xl border border-line" : "border-b border-line")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[360px] w-[360px] rounded-full opacity-60" style={{ background: "radial-gradient(circle at 50% 50%, rgba(206,143,44,.35), transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-[300px] w-[300px] rounded-full opacity-50" style={{ background: "radial-gradient(circle at 50% 50%, rgba(63,122,82,.30), transparent 70%)" }} />
        <div className={"relative mx-auto max-w-4xl px-6 " + (embedded ? "py-8" : "py-12")}>
          {!embedded && (
            <div className="flex items-center justify-between">
              <Logo />
              <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Done</Link>
            </div>
          )}
          <div className={embedded ? "" : "mt-8"}>
            <div className="eyebrow">{def.name}</div>
            {canvas.subject && (
              <h1 className={"display mt-2 text-ink " + (embedded ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl")}>{canvas.subject}</h1>
            )}
            {canvas.synthesis && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate2">{canvas.synthesis}</p>}
            {def.hasVerdict && canvas.verdict && (
              <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-line bg-white px-4 py-2 text-sm">
                <span className="relative inline-block h-4 w-6">
                  <span className="absolute left-0 top-0 h-4 w-4 rounded-full" style={{ background: SAGE, mixBlendMode: "multiply" }} />
                  <span className="absolute left-2 top-0 h-4 w-4 rounded-full" style={{ background: GOLD, mixBlendMode: "multiply" }} />
                </span>
                <span className="font-medium text-ink">{canvas.verdict}</span>
              </div>
            )}
            {hasScore && (
              <div className="mt-5 max-w-sm">
                <div className="mb-1 flex items-center justify-between text-sm text-slate2">
                  <span>{def.hasScore!.label}</span>
                  <span className="font-semibold text-ink">{canvas.score}/100</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${canvas.score}%`, background: "linear-gradient(90deg,#CE8F2C,#3F7A52)" }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Scorecard (rating dimensions, e.g. the 4 A's) */}
      {def.ratings?.length ? (
        <section className="mx-auto max-w-4xl px-6 pt-10">
          <div className="eyebrow mb-3">Scorecard</div>
          <div className="card p-6">
            <div className="space-y-3.5">
              {def.ratings.map((r) => {
                const v = Number((canvas.ratings || {})[r.key] ?? 0);
                return (
                  <div key={r.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{r.label}</span>
                      <span className="font-semibold text-ink">{v}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${v}%`, background: scoreColor(v) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Frontier plot */}
      {def.frontier && canvas.frontier ? (
        <section className="mx-auto max-w-4xl px-6 pt-10">
          <div className="eyebrow mb-3">The frontier</div>
          <div className="card p-6">
            <div className="grid gap-5 sm:grid-cols-2 sm:items-center">
              <FrontierPlot x={canvas.frontier.x} y={canvas.frontier.y} xLabel={def.frontier.xLabel} yLabel={def.frontier.yLabel} />
              <div>
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ background: complexityLevel(canvas.frontier.x, canvas.frontier.y).color }}>
                  {complexityLevel(canvas.frontier.x, canvas.frontier.y).label}
                </div>
                {def.groupNotes?.["The frontier"] && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{def.groupNotes["The frontier"]}</p>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Unit economics calculator */}
      {def.calculator && canvas.calc && Object.keys(canvas.calc).length > 0 ? (
        <section className="mx-auto max-w-4xl px-6 pt-10">
          <div className="eyebrow mb-3">Unit economics</div>
          <div className="card p-6">
            <UnitEconomics inputs={def.calculator.inputs} value={canvas.calc} readOnly />
          </div>
        </section>
      ) : null}

      {/* Groups */}
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="space-y-6">
          {groups.map((g) => {
            const note = def.frontier && g === "The frontier" ? null : def.groupNotes?.[g];
            return (
            <div key={g}>
              <div className="eyebrow mb-1">{g}</div>
              {note && <p className="mb-3 text-sm text-slate-500">{note}</p>}
              {!note && <div className="mb-3" />}
              <div className="grid gap-4 sm:grid-cols-2">
                {def.fields.filter((f) => f.group === g).map((f) => {
                  const v = fields[f.key];
                  const color = accentColor(f.accent);
                  const empty = f.kind === "list" || f.kind === "pairs" ? !(Array.isArray(v) && v.length) : !v;
                  return (
                    <div key={f.key} className="card overflow-hidden p-0">
                      <div className="h-1.5" style={{ background: color }} />
                      <div className="p-5">
                        <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>{f.label}</div>
                        {empty ? (
                          <p className="mt-1 text-sm text-slate-300">—</p>
                        ) : f.kind === "pairs" ? (
                          <ul className="mt-1.5 space-y-1.5">
                            {(v as { a: string; b: string }[]).map((p, i) => (
                              <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                                <span className="text-slate-700">{p.a}</span>
                                {p.b && (
                                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: color + "22", color }}>
                                    {p.b}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : f.kind === "list" ? (
                          <ul className="mt-1.5 space-y-1">
                            {(v as string[]).map((it, i) => (
                              <li key={i} className="flex gap-2 text-sm text-slate-700">
                                <span style={{ color }}>•</span>
                                <span>{it}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-sm leading-relaxed text-slate-700">{v}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>

        {!embedded && (
          <div className="mt-10 text-center text-sm text-slate2">
            <button onClick={() => window.print()} className="btn-ghost">↧ Save as PDF / print</button>
            {code && (
              <div className="mt-3">
                <Link href={`/room/${code}`} className="text-slate2 hover:text-ink">← Back to the exercise</Link>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
