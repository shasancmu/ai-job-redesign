"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

type Human = { task: string; value: string; excel: string };
type AI = { task: string; how: string; look?: string; prompt: string; cadence: string; check: string };
type Plan = {
  headline: string;
  summary: string;
  superadditive: string;
  allocation?: string;
  human: Human[];
  ai: AI[];
};

const SAGE = "#3F7A52";
const GOLD = "#CE8F2C";

export default function PlanView({ plan, embedded = false }: { plan: Plan; embedded?: boolean }) {
  return (
    <main className={embedded ? "" : "min-h-screen"}>
      {/* Hero */}
      <section className={"relative overflow-hidden " + (embedded ? "rounded-2xl border border-line" : "border-b border-line")}>
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[380px] w-[380px] rounded-full opacity-60"
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(206,143,44,.35), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-20 h-[320px] w-[320px] rounded-full opacity-50"
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(63,122,82,.30), transparent 70%)" }}
        />
        <div className={"relative mx-auto max-w-4xl px-6 " + (embedded ? "py-10" : "py-14")}>
          {!embedded && (
            <div className="flex items-center justify-between">
              <Logo />
              <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">
                ← Done
              </Link>
            </div>
          )}
          <div className={embedded ? "" : "mt-10"}>
            <div className="eyebrow">Your reimagined role</div>
            <h1 className={"display mt-3 text-ink " + (embedded ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl")}>
              {plan.headline || "Reimagined role"}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate2">{plan.summary}</p>
            {plan.superadditive && (
              <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-line bg-white px-4 py-2 text-sm">
                <span className="relative inline-block h-4 w-6">
                  <span className="absolute left-0 top-0 h-4 w-4 rounded-full" style={{ background: SAGE, mixBlendMode: "multiply" }} />
                  <span className="absolute left-2 top-0 h-4 w-4 rounded-full" style={{ background: GOLD, mixBlendMode: "multiply" }} />
                </span>
                <span className="font-medium text-ink">{plan.superadditive}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Where your week goes — time re-allocation */}
      {plan.allocation && (
        <section className="mx-auto max-w-4xl px-6 pt-10">
          <div className="card overflow-hidden p-0">
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${SAGE}, ${GOLD})` }} />
            <div className="p-6">
              <div className="eyebrow">Where your week goes</div>
              <p className="mt-2 text-base leading-relaxed text-ink">{plan.allocation}</p>
            </div>
          </div>
        </section>
      )}

      {/* Two halves */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Human */}
          <div>
            <ColumnHeader color={SAGE} title="You lead" sub="The value only you create" />
            <div className="mt-4 space-y-4">
              {plan.human.map((h, i) => (
                <div key={i} className="card overflow-hidden p-0">
                  <div className="h-1.5" style={{ background: SAGE }} />
                  <div className="p-5">
                    <div className="text-base font-bold text-ink">{h.task}</div>
                    <Field label="The value" color={SAGE}>{h.value}</Field>
                    <Field label="Be great at it" color={SAGE}>{h.excel}</Field>
                  </div>
                </div>
              ))}
              {plan.human.length === 0 && <Empty />}
            </div>
          </div>

          {/* AI */}
          <div>
            <ColumnHeader color={GOLD} title="AI powers" sub="What you delegate — and how" />
            <div className="mt-4 space-y-4">
              {plan.ai.map((a, i) => (
                <div key={i} className="card overflow-hidden p-0">
                  <div className="h-1.5" style={{ background: GOLD }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-base font-bold text-ink">{a.task}</div>
                      {a.cadence && (
                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{ background: GOLD + "1f", color: GOLD }}
                        >
                          {a.cadence}
                        </span>
                      )}
                    </div>
                    <Field label="How" color={GOLD}>{a.how}</Field>
                    {a.look && <Field label="Where to look" color={GOLD}>{a.look}</Field>}
                    {a.prompt && <PromptBlock prompt={a.prompt} />}
                    <Field label="You check" color={GOLD}>{a.check}</Field>
                  </div>
                </div>
              ))}
              {plan.ai.length === 0 && <Empty />}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-slate2">
          <button onClick={() => window.print()} className="btn-ghost">
            ↧ Save as PDF / print
          </button>
        </div>
      </section>
    </main>
  );
}

function ColumnHeader({ color, title, sub }: { color: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-3 w-3 rounded-full" style={{ background: color }} />
      <div>
        <div className="text-lg font-bold text-ink">{title}</div>
        <div className="text-sm text-slate2">{sub}</div>
      </div>
    </div>
  );
}

function Field({ label, color, children }: { label: string; color: string; children: any }) {
  if (!children) return null;
  return (
    <div className="mt-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>
        {label}
      </div>
      <p className="mt-0.5 text-sm leading-relaxed text-slate2">{children}</p>
    </div>
  );
}

function PromptBlock({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 rounded-xl bg-mist p-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate2">Starter prompt</div>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="text-xs text-slate2 hover:text-ink"
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <p className="mt-1 font-mono text-[13px] leading-relaxed text-ink">&ldquo;{prompt}&rdquo;</p>
    </div>
  );
}

function Empty() {
  return <div className="rounded-xl border border-dashed border-line p-5 text-sm text-slate2">Nothing here yet.</div>;
}
