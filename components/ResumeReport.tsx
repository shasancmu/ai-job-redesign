"use client";

import type { ResumeReport as Report } from "@/lib/resume";
import BottomLine from "@/components/BottomLine";

export default function ResumeReport({ report }: { report: Report }) {
  return (
    <div className="space-y-6">
      {report.bottomLine && <BottomLine b={report.bottomLine} />}

      {/* Make it yours: the authenticity guardrail, up top and unmissable */}
      <div className="rounded-2xl border border-amber/40 bg-amber-soft p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-amber">✍️ Make it yours</div>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          These are drafts to react to, not text to paste. Rewrite each line in your own voice, keep only what is true, and drop in your real numbers. A résumé that sounds like you, and that you can speak to in an interview, always beats polished copy you didn&apos;t write.
        </p>
      </div>

      {report.summary && (
        <Section title="Where your résumé stands">
          <p className="text-sm leading-relaxed text-slate-600">{report.summary}</p>
        </Section>
      )}

      {report.newSummary && (
        <Section title="A stronger summary to adapt">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{report.newSummary}</p>
        </Section>
      )}

      {(report.accomplishments || []).length > 0 && (
        <Section title="New accomplishments to add">
          <div className="space-y-3">
            {report.accomplishments.map((a, i) => (
              <div key={i} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm font-bold text-ink">{a.title}</div>
                  {a.where && <div className="shrink-0 text-xs text-slate-400">{a.where}</div>}
                </div>
                <p className="mt-1.5 rounded-lg bg-mist px-3 py-2 text-sm leading-relaxed text-ink">{a.bullet}</p>
                {a.why && <p className="mt-1.5 text-xs text-slate-500">{a.why}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(report.rewrites || []).length > 0 && (
        <Section title="Lines to rewrite">
          <div className="space-y-3">
            {report.rewrites.map((r, i) => (
              <div key={i} className="rounded-2xl border border-line bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-clay">Before</div>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-500 line-through decoration-clay/40">{r.before}</p>
                <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-sage">After</div>
                <p className="mt-0.5 text-sm leading-relaxed text-ink">{r.after}</p>
                {r.why && <p className="mt-1.5 text-xs text-slate-500">{r.why}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {report.skills && (report.skills.add?.length || report.skills.emphasize?.length || report.skills.retire?.length) ? (
        <Section title="Skills">
          <div className="grid gap-3 sm:grid-cols-3">
            <SkillCol label="Add" tone="text-sage" items={report.skills.add} />
            <SkillCol label="Feature" tone="text-sky" items={report.skills.emphasize} />
            <SkillCol label="Retire" tone="text-clay" items={report.skills.retire} />
          </div>
        </Section>
      ) : null}

      {(report.structure || []).length > 0 && (
        <Section title="Structure and formatting">
          <ul className="space-y-1.5">
            {report.structure.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-slate-300">•</span><span>{s}</span></li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function SkillCol({ label, tone, items }: { label: string; tone: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className={"text-xs font-semibold uppercase tracking-wide " + tone}>{label}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((x, i) => <span key={i} className="rounded-full bg-mist px-2.5 py-1 text-xs text-slate-700">{x}</span>)}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div>
      <h2 className="eyebrow mb-2">{title}</h2>
      <div className="card p-5">{children}</div>
    </div>
  );
}
