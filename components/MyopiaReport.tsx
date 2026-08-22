"use client";

import type { MyopiaReport as Report } from "@/lib/myopia";
import BottomLine from "@/components/BottomLine";

const TYPE_LABEL: Record<string, string> = {
  decentralize: "Decentralize",
  experiment: "Experiment",
  learn: "Learn",
  "engage-edges": "Engage the edges",
  bet: "Make a bet",
};

export default function MyopiaReport({ report, subjectWord = "business" }: { report: Report; subjectWord?: string }) {
  return (
    <div className="space-y-6">
      <div data-guide="headline">{report.bottomLine && <BottomLine b={report.bottomLine} />}</div>

      <div className="eyebrow pt-1">The diagnosis</div>

      {/* Bundle of choices, as a vector */}
      <Section title="Your bundle of choices" anchor="bundle">
        <p className="text-sm leading-relaxed text-slate-600">{report.bundle?.summary}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(report.bundle?.choices || []).map((c, i) => (
            <div key={i} className="rounded-xl border border-line bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{c.area}</div>
              <div className="mt-0.5 text-sm text-ink">{c.choice}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* How success narrowed you */}
      <Section title="How success narrowed your world" anchor="narrowed">
        <p className="text-sm leading-relaxed text-slate-600">{report.simplification}</p>
        {report.competencyTrap && (
          <div className="mt-3 rounded-2xl bg-amber-soft p-4">
            <div className="text-sm font-semibold text-amber">The competency trap</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{report.competencyTrap}</p>
          </div>
        )}
      </Section>

      {/* The three blind spots */}
      <div data-guide="blindspots">
        <h2 className="eyebrow mb-2">Your three blind spots</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Blind icon="🧭" tone="text-sky" label="Spatial · distant places" body={report.spatial?.blindSpot} items={report.spatial?.examples} />
          <Blind icon="⏳" tone="text-amber" label="Temporal · distant times" body={report.temporal?.blindSpot} items={report.temporal?.scenarios} itemLabel="What if…" />
          <Blind icon="🎲" tone="text-clay" label="Failure · playing it safe" body={report.failure?.blindSpot} note={report.failure?.note} />
        </div>
      </div>

      {/* Local optimum */}
      {report.localOptimum && (
        <Section title="Where you're stuck on a local peak">
          <p className="text-sm leading-relaxed text-slate-600">{report.localOptimum}</p>
        </Section>
      )}

      {/* Aspiration gap */}
      {report.aspiration && (
        <Section title="The aspiration gap">
          <div className="flex items-stretch gap-2 text-sm">
            <div className="flex-1 rounded-xl bg-mist p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Now</div>
              <div className="mt-0.5 text-ink">{report.aspiration.current}</div>
            </div>
            <div className="flex items-center text-slate-300">→</div>
            <div className="flex-1 rounded-xl bg-sage-soft p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-sage">Where you could be</div>
              <div className="mt-0.5 text-ink">{report.aspiration.aspiration}</div>
            </div>
          </div>
          {report.aspiration.gap && <p className="mt-2 text-sm text-slate-600">{report.aspiration.gap}</p>}
        </Section>
      )}

      {/* Exploration plan */}
      <Section title="Your exploration plan" anchor="plan">
        <p className="mb-3 text-xs text-slate-400">Design for exploration before you need it. Small, deliberate moves outside the boundary.</p>
        <div className="space-y-3">
          {(report.exploration || []).map((m, i) => (
            <div key={i} className="flex gap-3 rounded-2xl border border-line bg-white p-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-bold text-ink">{m.move}</span>
                  {m.type && <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate-500">{TYPE_LABEL[m.type] || m.type}</span>}
                </div>
                <div className="mt-0.5 text-sm text-slate-600">{m.why}</div>
                <div className="mt-1 text-sm"><span className="font-medium text-sage">This month:</span> {m.firstStep}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Blind({ icon, tone, label, body, items, itemLabel, note }: { icon: string; tone: string; label: string; body?: string; items?: string[]; itemLabel?: string; note?: string }) {
  return (
    <div className="card p-4">
      <div className={"flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide " + tone}><span aria-hidden>{icon}</span>{label}</div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{body}</p>
      {note && <p className="mt-1.5 text-xs text-slate-500">{note}</p>}
      {(items || []).length > 0 && (
        <ul className="mt-2 space-y-1">
          {items!.map((x, i) => <li key={i} className="text-xs text-slate-600">{itemLabel ? <span className="text-slate-400">{itemLabel} </span> : <span className="text-slate-300">• </span>}{x}</li>)}
        </ul>
      )}
    </div>
  );
}

function Section({ title, children, anchor }: { title: string; children: any; anchor?: string }) {
  return (
    <div data-guide={anchor}>
      <h2 className="eyebrow mb-2">{title}</h2>
      <div className="card p-5">{children}</div>
    </div>
  );
}
