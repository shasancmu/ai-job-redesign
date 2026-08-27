"use client";

import { useState } from "react";
import Link from "next/link";
import RoleplayChat, { type Msg } from "@/components/RoleplayChat";
import { streamPost } from "@/lib/streamClient";
import GenericRoleplayReport from "@/components/GenericRoleplayReport";

// Runs ANY role-play ModuleSpec (the public view). Self-contained: a run code
// drives the hidden scenario server-side; transcript lives in client state.
function makeCode() { let s = ""; for (let i = 0; i < 6; i++) s += "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]; return s; }

export default function RoleplaySpecRoom({ spec }: { spec: any }) {
  const [code] = useState(makeCode);
  const [phase, setPhase] = useState(0);
  const [chat, setChat] = useState<Msg[]>([]);
  const [verdict, setVerdict] = useState<Record<string, any>>({});
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const flow = (spec.flow || []) as any[];
  const step = flow[phase] || flow[0] || { kind: "brief", title: "" };
  const character = spec.character?.name || "the character";
  const conv = flow.find((f) => f.kind === "converse");
  const budget = conv?.budget || 0;
  const asked = chat.filter((m) => m.role === "user").length;
  const left = budget ? Math.max(0, budget - asked) : Infinity;

  async function onCall(history: Msg[], onChunk?: (d: string) => void) {
    return streamPost("/api/mechanics/roleplay/reply", { slug: spec.slug, code, messages: history }, onChunk || (() => {}));
  }
  async function grade() {
    setBusy(true); setErr("");
    try {
      const transcript = chat.map((m) => `${m.role === "user" ? "LEARNER" : character.toUpperCase()}: ${m.content}`).join("\n");
      const res = await fetch("/api/mechanics/roleplay/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: spec.slug, code, transcript, verdict }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.report) throw new Error(d.error || "Couldn't grade.");
      setReport(d.report);
    } catch (e: any) { setErr(e?.message || "Couldn't grade."); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/studio/roleplay" className="text-sm text-slate2 hover:text-ink">← Studio</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{spec.meta?.emoji} {spec.meta?.name} · preview</span>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {flow.map((p, i) => <button key={p.key} onClick={() => setPhase(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />)}
      </div>

      <div className="mb-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Step {phase + 1} of {flow.length}{step.minutes ? ` · ${step.minutes} min` : ""}</div>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
      </div>

      <div className="pb-24">
        {step.kind === "brief" && (
          <div className="space-y-4">
            {spec.world && <div className="card p-5"><div className="text-xs font-semibold uppercase tracking-wide text-sage">The situation</div><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{spec.world}</p></div>}
            {step.intro && <div className="rounded-2xl border border-line bg-mist p-5 text-sm leading-relaxed text-slate-700">{step.intro}</div>}
          </div>
        )}

        {step.kind === "converse" && (
          <div className="space-y-3">
            {budget ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-mist px-4 py-2.5 text-sm">
                <span className="text-slate-600">Ask what reveals the most. You don't know the truth going in.</span>
                <span className={"rounded-full px-3 py-1 font-semibold " + (left === 0 ? "bg-clay text-white" : left <= 2 ? "bg-amber text-white" : "bg-white text-ink")}>{left} left</span>
              </div>
            ) : null}
            <RoleplayChat chat={chat} setChat={setChat} onCall={onCall} counterpartName={character} aiOpens={!!step.aiOpens}
              placeholder={left === 0 ? "You've used your questions" : `Ask ${character}...`}
              disabled={left === 0} disabledHint={<>You've used all your questions. Move on to your verdict.</>} />
          </div>
        )}

        {step.kind === "verdict" && (
          <div className="space-y-4">
            {(step.verdict || []).map((f: any) => (
              <div key={f.key} className="card p-5">
                <div className="text-sm font-semibold text-ink">{f.label}</div>
                {f.type === "choice" && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {(f.options || []).map((o: any) => (
                      <button key={o.value} onClick={() => setVerdict((v) => ({ ...v, [f.key]: o.value }))} className={"rounded-xl border p-3 text-left text-sm font-bold transition " + (verdict[f.key] === o.value ? "border-ink bg-ink/5 ring-1 ring-ink text-ink" : "border-line bg-white hover:border-slate-300")}>{o.label}</button>
                    ))}
                  </div>
                )}
                {f.type === "scale" && (
                  <div className="mt-2"><input type="range" min={0} max={100} step={5} value={verdict[f.key] ?? 60} onChange={(e) => setVerdict((v) => ({ ...v, [f.key]: Number(e.target.value) }))} className="w-full accent-[color:var(--ink)]" /><div className="mt-1 text-right text-sm font-bold text-ink tabular-nums">{verdict[f.key] ?? 60}%</div></div>
                )}
                {f.type === "text" && <textarea className="field mt-2" rows={2} value={verdict[f.key] || ""} onChange={(e) => setVerdict((v) => ({ ...v, [f.key]: e.target.value }))} />}
              </div>
            ))}
          </div>
        )}

        {step.kind === "report" && (
          report ? <GenericRoleplayReport report={report} blocks={spec.report || []} />
          : <div className="card p-8 text-center"><p className="text-slate-600">Grade this run against the module's rubric.</p><button onClick={grade} disabled={busy} className="btn-primary mt-4 text-sm">{busy ? "Grading..." : "✨ Grade my run"}</button>{err && <p className="mt-3 text-sm text-red-700">{err}</p>}</div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => setPhase((p) => Math.max(0, p - 1))} disabled={phase === 0} className="btn-ghost">Back</button>
          {phase < flow.length - 1 ? <button onClick={() => setPhase((p) => p + 1)} className="btn-primary">Next →</button> : <Link href="/studio/roleplay" className="btn-primary">Done</Link>}
        </div>
      </div>
    </main>
  );
}
