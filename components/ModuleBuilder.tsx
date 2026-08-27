"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BuilderSpec, DEFAULT_SPEC, SUPER_TYPES, validateSpec } from "@/lib/moduleBuilder";

// The no-code builder: fill in plain-English fields, watch the 3-step flow
// (Setup → Interview → Report) build live, then save and test-run. The server
// compiles the spec into a hardened, runnable module; nothing here writes prompts.
export default function ModuleBuilder({
  initialSpec, editSlug, canGlobal, orgName,
}: {
  initialSpec?: BuilderSpec; editSlug?: string; canGlobal: boolean; orgName?: string | null;
}) {
  const [spec, setSpec] = useState<BuilderSpec>(initialSpec || DEFAULT_SPEC);
  const [scope, setScope] = useState<"org" | "global">(orgName ? "org" : "global");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ slug: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const set = (patch: Partial<BuilderSpec>) => setSpec((s) => ({ ...s, ...patch }));
  const errors = useMemo(() => validateSpec(spec), [spec]);

  async function save(status: "draft" | "published") {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/builder/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, scope, status, editSlug }),
      });
      const d = await res.json();
      if (res.ok && d.slug) setSaved({ slug: d.slug });
      else setErr(d.error || "Couldn't save.");
    } catch { setErr("Couldn't save."); }
    setBusy(false);
  }

  const topics = spec.topics || [];
  const sections = spec.sections || [];
  const ratings = spec.ratings || [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* ---- The form ---- */}
      <div className="space-y-6">
        {/* Basics */}
        <Section title="The basics">
          <Row>
            <Field label="Module name" className="flex-1"><input className="field" value={spec.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Team Health Check" /></Field>
            <Field label="Emoji" className="w-20"><input className="field text-center" value={spec.emoji || ""} onChange={(e) => set({ emoji: e.target.value })} maxLength={2} /></Field>
          </Row>
          <Field label="One-line description"><input className="field" value={spec.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="What the person gets out of it, in a sentence." /></Field>
          <Field label="What is this module about? (the subject)" hint="Used throughout, e.g. 'your team', 'a hiring plan'."><input className="field" value={spec.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="your team's health" /></Field>
        </Section>

        {/* Super-type */}
        <Section title="Type">
          <div className="grid gap-2 sm:grid-cols-3">
            {SUPER_TYPES.map((t) => (
              <button key={t.key} onClick={() => set({ superType: t.key })} className={"rounded-xl border-2 p-3 text-left transition " + (spec.superType === t.key ? "border-ink bg-slate-50" : "border-line hover:border-slate-300")}>
                <div className="text-sm font-semibold text-ink">{t.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{t.blurb}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* The interview */}
        <Section title="The interview">
          <Field label="Who should the AI interviewer be?" hint="A style/persona, not a script."><input className="field" value={spec.persona} onChange={(e) => set({ persona: e.target.value })} placeholder="a warm, sharp operations advisor" /></Field>
          <Field label="Framework to apply (optional)" hint="The logic the AI grounds the interview and canvas in. This is what makes it rigorous."><textarea className="field" rows={3} value={spec.framework || ""} onChange={(e) => set({ framework: e.target.value })} placeholder="e.g. Porter's Five Forces: rivalry, new entrants, substitutes, buyer power, supplier power; assess structural attractiveness." /></Field>
          <Field label="What should it ask about?" hint="One theme per line. The AI covers them naturally.">
            <div className="space-y-2">
              {topics.map((t, i) => (
                <div key={i} className="flex gap-2">
                  <input className="field flex-1" value={t} onChange={(e) => { const n = [...topics]; n[i] = e.target.value; set({ topics: n }); }} placeholder={`Topic ${i + 1}`} />
                  <button onClick={() => set({ topics: topics.filter((_, k) => k !== i) })} className="btn-ghost px-2 text-slate-400">✕</button>
                </div>
              ))}
              <button onClick={() => set({ topics: [...topics, ""] })} className="text-sm font-semibold text-ai hover:underline">+ Add topic</button>
            </div>
          </Field>
          <Field label="Opening question label" hint="The first thing the person names to seed context.">
            <input className="field" value={spec.setupTitle} onChange={(e) => set({ setupTitle: e.target.value })} placeholder="What are we looking at?" />
          </Field>
        </Section>

        {/* The report */}
        <Section title="The report">
          <Field label="Sections" hint="Each becomes a part of the report. Say what it should contain.">
            <div className="space-y-3">
              {sections.map((s, i) => (
                <div key={i} className="rounded-xl border border-line p-3">
                  <div className="flex gap-2">
                    <input className="field flex-1" value={s.name} onChange={(e) => { const n = [...sections]; n[i] = { ...s, name: e.target.value }; set({ sections: n }); }} placeholder="Field name, e.g. Biggest risk" />
                    <select className="field w-28" value={s.kind} onChange={(e) => { const n = [...sections]; n[i] = { ...s, kind: e.target.value as any }; set({ sections: n }); }}>
                      <option value="long">Paragraph</option>
                      <option value="text">Short</option>
                      <option value="list">List</option>
                      <option value="pairs">Pairs</option>
                    </select>
                    <input className="field w-32" value={s.group || ""} onChange={(e) => { const n = [...sections]; n[i] = { ...s, group: e.target.value }; set({ sections: n }); }} placeholder="Group / heading" />
                    <button onClick={() => set({ sections: sections.filter((_, k) => k !== i) })} className="btn-ghost px-2 text-slate-400">✕</button>
                  </div>
                  <input className="field mt-2 w-full" value={s.contains} onChange={(e) => { const n = [...sections]; n[i] = { ...s, contains: e.target.value }; set({ sections: n }); }} placeholder="What this field should contain…" />
                  {s.kind === "pairs" && (
                    <div className="mt-2 flex gap-2">
                      <input className="field flex-1" value={s.leftLabel || ""} onChange={(e) => { const n = [...sections]; n[i] = { ...s, leftLabel: e.target.value }; set({ sections: n }); }} placeholder="Left label, e.g. Measure" />
                      <input className="field flex-1" value={s.rightLabel || ""} onChange={(e) => { const n = [...sections]; n[i] = { ...s, rightLabel: e.target.value }; set({ sections: n }); }} placeholder="Right label, e.g. Target" />
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => set({ sections: [...sections, { name: "", contains: "", kind: "long" }] })} className="text-sm font-semibold text-ai hover:underline">+ Add section</button>
            </div>
          </Field>

          {spec.superType === "scorecard" && (
            <Field label="Scored dimensions (0–100)" hint="The AI scores each; shown as meters.">
              <div className="space-y-2">
                {ratings.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="field flex-1" value={r} onChange={(e) => { const n = [...ratings]; n[i] = e.target.value; set({ ratings: n }); }} placeholder={`Dimension ${i + 1}, e.g. Clarity`} />
                    <button onClick={() => set({ ratings: ratings.filter((_, k) => k !== i) })} className="btn-ghost px-2 text-slate-400">✕</button>
                  </div>
                ))}
                <button onClick={() => set({ ratings: [...ratings, ""] })} className="text-sm font-semibold text-ai hover:underline">+ Add dimension</button>
              </div>
            </Field>
          )}

          {spec.superType === "verdict" && (
            <Row>
              <Field label="Verdict headline label" className="flex-1"><input className="field" value={spec.verdictLabel || ""} onChange={(e) => set({ verdictLabel: e.target.value })} placeholder="The verdict" /></Field>
              <Field label="Overall score label (optional)" className="flex-1"><input className="field" value={spec.scoreLabel || ""} onChange={(e) => set({ scoreLabel: e.target.value })} placeholder="Readiness" /></Field>
            </Row>
          )}
        </Section>

        {/* Publish */}
        <Section title="Publish">
          <div className="flex flex-wrap gap-2">
            {orgName && <ScopeChip active={scope === "org"} onClick={() => setScope("org")} title={`My organization`} sub={`Only ${orgName} members`} />}
            {canGlobal && <ScopeChip active={scope === "global"} onClick={() => setScope("global")} title="Everyone" sub="Global, all users see it" />}
          </div>
          {errors.length > 0 && <ul className="mt-3 space-y-1 text-sm text-clay">{errors.map((e, i) => <li key={i}>• {e}</li>)}</ul>}
          {err && <p className="mt-2 text-sm text-clay">{err}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => save("published")} disabled={busy || errors.length > 0} className="btn-primary text-sm disabled:opacity-40">{busy ? "Saving…" : editSlug ? "Save changes" : "Publish"}</button>
            <button onClick={() => save("draft")} disabled={busy || errors.length > 0} className="btn-ghost text-sm disabled:opacity-40">Save as draft</button>
            {saved && <Link href={`/start/${saved.slug}`} className="text-sm font-semibold text-ai hover:underline">Test run →</Link>}
          </div>
          {saved && <p className="mt-2 text-xs text-slate-400">Saved as <span className="font-mono">{saved.slug}</span>. Test run it, then share <span className="font-mono">/start/{saved.slug}</span>.</p>}
        </Section>
      </div>

      {/* ---- Live flow preview ---- */}
      <div className="lg:sticky lg:top-6 lg:h-fit">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your module</div>
        <div className="mt-2 space-y-2">
          <FlowCard n={1} title="Setup" tone="slate">
            <div className="text-sm font-semibold text-ink">{spec.emoji} {spec.name || "Untitled module"}</div>
            <div className="text-xs text-slate-500">{spec.setupTitle || "What are we looking at?"}</div>
          </FlowCard>
          <FlowCard n={2} title="AI interview" tone="ai">
            <div className="text-xs text-slate-500">As {spec.persona || "an advisor"}, about {spec.subject || "the subject"}:</div>
            <ul className="mt-1 space-y-0.5">{topics.filter(Boolean).map((t, i) => <li key={i} className="text-xs text-slate-600">• {t}</li>)}{topics.filter(Boolean).length === 0 && <li className="text-xs text-slate-300">add topics…</li>}</ul>
          </FlowCard>
          <FlowCard n={3} title={SUPER_TYPES.find((t) => t.key === spec.superType)?.name || "Report"} tone="sage">
            <ul className="space-y-0.5">{sections.filter((s) => s.name).map((s, i) => <li key={i} className="text-xs text-slate-600">• {s.name}</li>)}{sections.filter((s) => s.name).length === 0 && <li className="text-xs text-slate-300">add sections…</li>}</ul>
            {spec.superType === "scorecard" && ratings.filter(Boolean).length > 0 && <div className="mt-1 text-xs text-slate-500">Scores: {ratings.filter(Boolean).join(", ")}</div>}
            {spec.superType === "verdict" && <div className="mt-1 text-xs text-slate-500">+ {spec.verdictLabel || "verdict"}</div>}
          </FlowCard>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card p-5"><div className="mb-3 text-sm font-bold text-ink">{title}</div><div className="space-y-4">{children}</div></div>;
}
function Row({ children }: { children: React.ReactNode }) { return <div className="flex flex-wrap gap-3">{children}</div>; }
function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><label className="lbl">{label}</label>{hint && <div className="mb-1 text-xs text-slate-400">{hint}</div>}{children}</div>;
}
function FlowCard({ n, title, tone, children }: { n: number; title: string; tone: "slate" | "ai" | "sage"; children: React.ReactNode }) {
  const c = tone === "ai" ? "border-ai/40 bg-ai/5" : tone === "sage" ? "border-sage/40 bg-sage-soft/40" : "border-line bg-mist/40";
  return (
    <div className={"rounded-xl border p-3 " + c}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Step {n} · {title}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function ScopeChip({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button onClick={onClick} className={"rounded-xl border-2 px-3 py-2 text-left transition " + (active ? "border-ink bg-slate-50" : "border-line hover:border-slate-300")}>
      <div className="text-sm font-semibold text-ink">{title}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </button>
  );
}
