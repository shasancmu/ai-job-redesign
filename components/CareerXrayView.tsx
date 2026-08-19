"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import ShareReport from "@/components/ShareReport";
import { EXPOSURE_META, MODE_META, CITATIONS } from "@/lib/careerXray";

const SAGE = "#3F7A52";
const GOLD = "#CE8F2C";

export default function CareerXrayView({ xray, mode = "resume", code, embedded = false }: { xray: any; mode?: string; code?: string; embedded?: boolean }) {
  const isJD = mode === "jd";
  const tasks: any[] = xray.tasks || [];
  return (
    <main className={embedded ? "" : "min-h-screen"}>
      {/* Hero */}
      <section className={"relative overflow-hidden " + (embedded ? "rounded-2xl border border-line" : "border-b border-line")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[360px] w-[360px] rounded-full opacity-60" style={{ background: "radial-gradient(circle at 50% 50%, rgba(206,143,44,.35), transparent 70%)" }} />
        <div className={"relative mx-auto max-w-4xl px-6 " + (embedded ? "py-8" : "py-12")}>
          {!embedded && (
            <div className="flex items-center justify-between">
              <Logo />
              <div className="flex items-center gap-2">
                {code && <ShareReport code={code} title="A Job & AI X-ray" text="Here's my Job & AI X-ray from Superadditive:" />}
                <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Done</Link>
              </div>
            </div>
          )}
          <div className={embedded ? "" : "mt-8"}>
            <div className="eyebrow">{isJD ? "Job & AI X-ray · role" : "Job & AI X-ray"}</div>
            {xray.headline && <h1 className={"display mt-2 text-ink " + (embedded ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl")}>{xray.headline}</h1>}
            {xray.summary && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate2">{xray.summary}</p>}
          </div>
        </div>
      </section>

      {/* Dual benchmark */}
      <section className="mx-auto max-w-4xl px-6 pt-10">
        <div className="eyebrow mb-3">Exposure: the two views</div>
        <div className="card p-6">
          <Bar
            label={`Top-down · ${xray.occupation || "occupation"}${xray.occupationCode ? ` (SOC ${xray.occupationCode})` : ""}`}
            sub={xray.topDownSource === "published" ? "published occupation exposure (Eloundou et al.)" : "occupation estimate, rubric-based"}
            value={xray.topDownExposure}
            color={GOLD}
          />
          <div className="mt-4"><Bar label="Bottom-up · your actual tasks" sub="from the tasks below" value={xray.bottomUpExposure} color={SAGE} /></div>
          <p className="mt-4 text-xs text-slate-400">
            The gap is the point: what the models predict for the occupation vs. what {isJD ? "this role" : "you"} actually does. Exposure ≠ replacement. High exposure means AI can help with the task, and your complements rise in value.
          </p>
        </div>
      </section>

      {/* Automate / augment / human */}
      <section className="mx-auto max-w-4xl px-6 pt-8">
        <div className="card p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Where the work goes</div>
          <div className="mt-3 flex h-4 overflow-hidden rounded-full">
            <span style={{ width: `${xray.automateShare || 0}%`, background: "#B4532E" }} title="Automate" />
            <span style={{ width: `${xray.augmentShare || 0}%`, background: GOLD }} title="Augment" />
            <span style={{ width: `${xray.humanShare || 0}%`, background: SAGE }} title="Human" />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
            <span><b style={{ color: "#B4532E" }}>{xray.automateShare || 0}%</b> automate</span>
            <span><b style={{ color: GOLD }}>{xray.augmentShare || 0}%</b> augment</span>
            <span><b style={{ color: SAGE }}>{xray.humanShare || 0}%</b> stays human</span>
          </div>
        </div>
      </section>

      {/* Task table */}
      {tasks.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 pt-8">
          <div className="eyebrow mb-3">Task by task</div>
          <div className="card p-5">
            <div className="space-y-2.5">
              {tasks.map((t, i) => {
                const e = EXPOSURE_META[t.exposure] || EXPOSURE_META.E1;
                const m = MODE_META[t.mode] || MODE_META.complement;
                return (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <span className="text-ink">{t.task}</span>
                      {t.note && <span className="ml-1.5 text-xs text-slate-400">{t.note}</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: e.color }}>{t.exposure}</span>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: m.color + "1f", color: m.color }}>{m.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-400">
              {Object.values(EXPOSURE_META).map((e) => (<span key={e.label}><b style={{ color: e.color }}>{e.label.split(" · ")[0]}</b> {e.blurb}</span>))}
            </div>
          </div>
        </section>
      )}

      {/* New tasks — the reinvention half */}
      {xray.newTasks?.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 pt-8">
          <div className="eyebrow mb-3">New work to own</div>
          <p className="mb-3 max-w-2xl text-sm text-slate2">As AI absorbs the routine, redesign creates higher-value tasks (Acemoglu &amp; Restrepo). {isJD ? "Build the role around these." : "Grow into these."}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {xray.newTasks.map((n: any, i: number) => (
              <div key={i} className="card overflow-hidden p-0">
                <div className="h-1.5" style={{ background: SAGE }} />
                <div className="p-5">
                  <div className="text-base font-bold text-ink">{n.task}</div>
                  <p className="mt-1 text-sm text-slate-600">{n.why}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Durable value + career vectors */}
      <section className="mx-auto max-w-4xl px-6 pt-8">
        <div className="grid gap-6 sm:grid-cols-2">
          {xray.durableValue?.length > 0 && (
            <div>
              <div className="eyebrow mb-2">{isJD ? "What only a human brings" : "Lean into this"}</div>
              <ul className="space-y-1.5">
                {xray.durableValue.map((d: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700"><span style={{ color: SAGE }}>▪</span><span>{d}</span></li>
                ))}
              </ul>
            </div>
          )}
          {xray.careerVectors?.length > 0 && (
            <div>
              <div className="eyebrow mb-2">{isJD ? "Where this person comes from" : "Where you can go"}</div>
              <ul className="space-y-2">
                {xray.careerVectors.map((v: any, i: number) => (
                  <li key={i} className="text-sm"><span className="font-semibold text-ink">{v.role}:</span> <span className="text-slate-500">{v.why}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Job search / sourcing */}
      {(xray.jobSearch?.keywords?.length || xray.jobSearch?.whereToLook?.length) > 0 && (
        <section className="mx-auto max-w-4xl px-6 pt-8">
          <div className="eyebrow mb-3">{isJD ? "How to find this person" : "How to find your next role"}</div>
          <div className="card grid gap-5 p-6 sm:grid-cols-3">
            <SearchCol title={isJD ? "Search keywords" : "Resume / search keywords"} items={xray.jobSearch.keywords} pill />
            <SearchCol title="Where to look" items={xray.jobSearch.whereToLook} />
            <SearchCol title={isJD ? "Screen for" : "Signals to build"} items={xray.jobSearch.signals} />
          </div>
        </section>
      )}

      {/* Citations */}
      <section className="mx-auto max-w-4xl px-6 pt-8">
        <div className="rounded-2xl border border-line bg-mist p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The research behind this</div>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
            {CITATIONS.map((c) => (
              <li key={c.authors}><span className="font-semibold text-ink">{c.authors}</span>, <span className="italic">{c.work}</span>: {c.used}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">Occupation exposure is a rubric-based estimate (Eloundou et al.) over O*NET-style tasks; treat it as a benchmark, not a verdict.</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12 text-center text-sm text-slate2">
        {!embedded && <button onClick={() => window.print()} className="btn-ghost">↧ Save as PDF / print</button>}
        {!embedded && code && <div className="mt-3"><Link href={`/room/${code}`} className="text-slate2 hover:text-ink">← Back to the exercise</Link></div>}
      </section>
    </main>
  );
}

function Bar({ label, sub, value, color }: { label: string; sub: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="font-semibold text-ink">{value || 0}% exposed</span>
      </div>
      <div className="text-xs text-slate-400">{sub}</div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${value || 0}%`, background: color }} />
      </div>
    </div>
  );
}

function SearchCol({ title, items, pill }: { title: string; items?: string[]; pill?: boolean }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      {pill ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((s, i) => (<span key={i} className="rounded-full bg-mist px-2 py-0.5 text-xs text-slate-700">{s}</span>))}
        </div>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((s, i) => (<li key={i} className="flex gap-1.5 text-sm text-slate-600"><span className="text-slate-300">•</span><span>{s}</span></li>))}
        </ul>
      )}
    </div>
  );
}
