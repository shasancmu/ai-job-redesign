"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import WorkflowFlow from "@/components/WorkflowFlow";
import TradeoffPlan from "@/components/TradeoffPlan";
import { STEP_ROLES } from "@/lib/workflow";

const SAGE = "#3F7A52";
const GOLD = "#CE8F2C";

export default function WorkflowPlanView({ doc, code }: { doc: any; code: string }) {
  const analysis: any = doc.analysis || {};
  const flow: any[] = analysis.flow?.length ? analysis.flow : doc.steps || [];
  const opps: any[] = analysis.opportunities || [];

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[380px] w-[380px] rounded-full opacity-60"
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(206,143,44,.35), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-20 h-[320px] w-[320px] rounded-full opacity-50"
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(63,122,82,.30), transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-4xl px-6 py-14">
          <div className="flex items-center justify-between">
            <Logo />
            <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">
              ← Done
            </Link>
          </div>
          <div className="mt-10">
            <div className="eyebrow">Your workflow, redesigned</div>
            <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">{doc.name || "Redesigned workflow"}</h1>
            {analysis.summary && (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate2">{analysis.summary}</p>
            )}
            {doc.stop_start && (
              <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-line bg-white px-4 py-2 text-sm">
                <span className="relative inline-block h-4 w-6">
                  <span className="absolute left-0 top-0 h-4 w-4 rounded-full" style={{ background: SAGE, mixBlendMode: "multiply" }} />
                  <span className="absolute left-2 top-0 h-4 w-4 rounded-full" style={{ background: GOLD, mixBlendMode: "multiply" }} />
                </span>
                <span className="font-medium text-ink">We&apos;d stop &amp; start: {doc.stop_start}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* The redesigned flow */}
      {flow.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 pt-12">
          <div className="eyebrow">The flow — AI + human</div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate2">
            {STEP_ROLES.map((r) => (
              <span key={r.key} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: r.color }} />
                {r.label}
              </span>
            ))}
          </div>
          <div className="mt-6">
            <WorkflowFlow steps={flow} editable={false} />
          </div>
        </section>
      )}

      {/* Start this week */}
      {opps.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pt-14">
          <div className="eyebrow">Start this week</div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {opps.map((o, i) => (
              <div key={i} className="card overflow-hidden p-0">
                <div className="h-1.5" style={{ background: GOLD }} />
                <div className="p-6">
                  <div className="text-base font-bold text-ink">{o.title}</div>
                  <PlanField label="The outcome">{o.outcome}</PlanField>
                  <PlanField label="How AI does it">{o.how}</PlanField>
                  <PlanField label="Prep fast">{o.prep}</PlanField>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* The three trade-off plans */}
      {analysis.tradeoffs && (
        <section className="mx-auto max-w-4xl px-6 pt-14">
          <div className="eyebrow mb-4">Holding the line</div>
          <TradeoffPlan plan={analysis.tradeoffs} />
        </section>
      )}

      <section className="mx-auto max-w-4xl px-6 py-14 text-center text-sm text-slate2">
        <button onClick={() => window.print()} className="btn-ghost">
          ↧ Save as PDF / print
        </button>
        <div className="mt-3">
          <Link href={`/room/${code}`} className="text-slate2 hover:text-ink">
            ← Back to the exercise
          </Link>
        </div>
      </section>
    </main>
  );
}

function PlanField({ label, children }: { label: string; children: any }) {
  if (!children) return null;
  return (
    <div className="mt-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: GOLD }}>
        {label}
      </div>
      <p className="mt-0.5 text-sm leading-relaxed text-slate2">{children}</p>
    </div>
  );
}
