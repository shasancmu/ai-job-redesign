"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CONSULT_STEPS, WMS, WMS_AREAS } from "@/lib/business";
import Timer from "@/components/Timer";
import ConsultReport from "@/components/ConsultReport";

type Msg = { role: "user" | "assistant"; content: string };

export default function ConsultRoom({
  me,
  session,
  initialWorkspace,
}: {
  me: string;
  session: any;
  initialWorkspace: any;
}) {
  const supabase = createClient();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const state = ws.canvas || {};
  const step = CONSULT_STEPS[phase] ?? CONSULT_STEPS[0];

  const pending = useRef<Record<string, any>>({});
  const timer = useRef<any>(null);
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    await supabase.from("workspaces").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }, [supabase, ws.id]);
  const update = useCallback((patch: Record<string, any>) => {
    setWs((w: any) => ({ ...w, ...patch }));
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  }, [flush]);
  const setState = (patch: Record<string, any>) => update({ canvas: { ...state, ...patch } });

  async function go(i: number) {
    const clamped = Math.max(0, Math.min(CONSULT_STEPS.length - 1, i));
    const status = clamped >= CONSULT_STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  const intake = state.intake || {};
  const canAdvance = phase !== 0 || (intake.name?.trim() && intake.sells?.trim());

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">The 30-Minute Consult</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {CONSULT_STEPS.map((p, i) => (
          <button key={p.key} onClick={() => go(i)} className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")} />
        ))}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Step {phase + 1} of {CONSULT_STEPS.length}</div>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
      </div>

      <div className="pb-24">
        {step.key === "intake" && <Intake intake={intake} setIntake={(p) => setState({ intake: { ...intake, ...p } })} />}
        {step.key === "interview" && <Interview state={state} setState={setState} ctx={{ name: intake.name, sells: intake.sells }} onSkip={() => go(2)} />}
        {step.key === "practices" && <Practices answers={state.wms?.answers || {}} setAnswers={(a) => setState({ wms: { answers: a } })} />}
        {step.key === "eighty" && <Eighty data={state.eighty || {}} setData={(p) => setState({ eighty: { ...(state.eighty || {}), ...p } })} />}
        {step.key === "photos" && <Photos state={state} setState={setState} sells={intake.sells} />}
        {step.key === "report" && <ReportStep state={state} setState={setState} code={session.code} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">Back</button>
          {phase < CONSULT_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} disabled={!canAdvance} className="btn-primary">Next →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">Finish</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ label, children, hint }: { label: string; children: any; hint?: string }) {
  return (
    <div>
      <label className="lbl">{label}</label>
      {hint && <div className="mb-1 text-xs text-slate-400">{hint}</div>}
      {children}
    </div>
  );
}

function Intake({ intake, setIntake }: { intake: any; setIntake: (p: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
        A quick portrait of your business. Nothing here is shared, it just grounds the consult.
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Business name"><input className="field" value={intake.name || ""} onChange={(e) => setIntake({ name: e.target.value })} placeholder="e.g. Bloom & Co Bakery" /></Field>
        <Field label="Industry"><input className="field" value={intake.industry || ""} onChange={(e) => setIntake({ industry: e.target.value })} placeholder="e.g. Retail bakery" /></Field>
      </div>
      <Field label="What do you sell?" hint="In a line or two."><textarea className="field min-h-[70px]" value={intake.sells || ""} onChange={(e) => setIntake({ sells: e.target.value })} placeholder="Products or services, and to whom." /></Field>
      <Field label="How do you make money?" hint="Where does the revenue actually come from?"><textarea className="field min-h-[70px]" value={intake.howMakeMoney || ""} onChange={(e) => setIntake({ howMakeMoney: e.target.value })} placeholder="e.g. Walk-in sales, wholesale to cafes, custom orders." /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Roughly how many people?"><input className="field" value={intake.size || ""} onChange={(e) => setIntake({ size: e.target.value })} placeholder="e.g. Just me / 8 / 40" /></Field>
        <Field label="Roughly how old is the business?"><input className="field" value={intake.age || ""} onChange={(e) => setIntake({ age: e.target.value })} placeholder="e.g. 3 years" /></Field>
      </div>
    </div>
  );
}

function Interview({ state, setState, ctx, onSkip }: { state: any; setState: (p: any) => void; ctx: any; onSkip: () => void }) {
  const messages: Msg[] = state.interview_chat || [];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const call = useCallback(async (history: Msg[]) => {
    setErr(null); setBusy(true);
    try {
      const res = await fetch("/api/consult", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "chat", messages: history, ctx }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "The advisor is unavailable."); return null; }
      return data.reply as string;
    } catch { setErr("The advisor is unavailable."); return null; } finally { setBusy(false); }
  }, [ctx]);

  useEffect(() => {
    if (started.current || messages.length > 0) { started.current = true; return; }
    started.current = true;
    call([]).then((reply) => { if (reply) setState({ interview_chat: [{ role: "assistant", content: reply }] }); });
  }, []); // eslint-disable-line
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [messages.length, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setState({ interview_chat: next });
    setInput("");
    const reply = await call(next);
    if (reply) setState({ interview_chat: [...next, { role: "assistant", content: reply }] });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Talk to the advisor about how your business really works. <button onClick={onSkip} className="text-ink underline">Skip ahead</button></p>
      <div className="card flex flex-col p-5" style={{ height: "54vh", minHeight: 360 }}>
        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && busy && <div className="text-slate-400">The advisor is thinking of an opening question…</div>}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " + (m.role === "user" ? "bg-ink text-white" : "bg-slate-100 text-slate-800")}>{m.content}</div>
            </div>
          ))}
          {busy && messages.length > 0 && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div></div>}
        </div>
        {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <form onSubmit={send} className="mt-3 flex items-center gap-2">
          <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" disabled={busy} />
          <button className="btn-primary" disabled={busy || !input.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
}

function Practices({ answers, setAnswers }: { answers: Record<string, number>; setAnswers: (a: Record<string, number>) => void }) {
  const answered = Object.keys(answers).length;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
        Eight quick reads on how the business is run (Bloom, Van Reenen & Sadun). Pick the closest. <span className="font-medium text-ink">{answered}/{WMS.length}</span>
      </div>
      {WMS_AREAS.map((area) => (
        <div key={area.key}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{area.label}</div>
          <div className="space-y-3">
            {WMS.filter((q) => q.area === area.key).map((q) => (
              <div key={q.id} className="card p-4">
                <div className="text-sm font-medium text-ink">{q.prompt}</div>
                <div className="mt-2 grid gap-1.5">
                  {q.options.map((o) => {
                    const chosen = answers[q.id] === o.score;
                    return (
                      <button
                        key={o.score}
                        onClick={() => setAnswers({ ...answers, [q.id]: o.score })}
                        className={"rounded-lg border px-3 py-2 text-left text-sm transition " + (chosen ? "border-ink bg-ink/[0.03] text-ink" : "border-line bg-white text-slate-600 hover:border-slate-300")}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Eighty({ data, setData }: { data: any; setData: (p: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
        The 80/20: usually a small slice of products and customers drives most of the money. Rough answers are fine.
      </div>
      <Field label="What sells the most?" hint="Your top few products or services by volume."><textarea className="field min-h-[64px]" value={data.topSellers || ""} onChange={(e) => setData({ topSellers: e.target.value })} placeholder="e.g. Sourdough loaves, morning pastries, wedding cakes" /></Field>
      <Field label="What earns the most?" hint="Where do you think the margin actually comes from? (Often different from what sells most.)"><textarea className="field min-h-[64px]" value={data.topEarners || ""} onChange={(e) => setData({ topEarners: e.target.value })} placeholder="e.g. Custom cakes, wholesale contracts" /></Field>
      <Field label="Who are your biggest customers?" hint="The few that matter most, and roughly what share."><textarea className="field min-h-[64px]" value={data.biggestCustomers || ""} onChange={(e) => setData({ biggestCustomers: e.target.value })} placeholder="e.g. Two local cafes are ~40% of revenue" /></Field>
      <Field label="Where does the work get stuck?" hint="The bottleneck that most limits you."><textarea className="field min-h-[64px]" value={data.bottleneck || ""} onChange={(e) => setData({ bottleneck: e.target.value })} placeholder="e.g. One oven; my time on custom orders" /></Field>
    </div>
  );
}

function downscale(file: File, max: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const ctx = c.getContext("2d"); if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

function Photos({ state, setState, sells }: { state: any; setState: (p: any) => void; sells?: string }) {
  const photos: { title: string; description: string }[] = state.photos || [];
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      const image = await downscale(file, 1280, 0.85);
      const res = await fetch("/api/consult", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "photo", image, sells }) });
      const d = await res.json();
      if (!res.ok) setErr(d.error || "Couldn't read that photo.");
      else setState({ photos: [{ title: d.title, description: d.kind === "text" && d.transcript ? d.transcript : d.description }, ...photos] });
    } catch { setErr("Couldn't read that photo."); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
        Optional but powerful: snap a few photos of your business, the shop floor, your products, a workspace, a shelf. AI reads what it reveals about the operation. <span className="text-slate-400">Photos are analyzed and never stored.</span>
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-primary w-full py-3.5">{busy ? "Reading your photo…" : "📷 Add a photo"}</button>
      {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      {photos.length > 0 && (
        <div className="space-y-2">
          {photos.map((p, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-ink">{p.title}</div>
                  <p className="mt-1 text-sm text-slate-600">{p.description}</p>
                </div>
                <button onClick={() => setState({ photos: photos.filter((_, j) => j !== i) })} className="shrink-0 text-slate-300 hover:text-clay">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportStep({ state, setState, code }: { state: any; setState: (p: any) => void; code: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const report = state.report;
  const wms = state.wmsScore;

  async function run() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "report",
          intake: state.intake || {},
          interview: state.interview_chat || [],
          wms: { answers: state.wms?.answers || {} },
          eighty: state.eighty || {},
          photos: state.photos || [],
        }),
      });
      const d = await res.json();
      if (res.ok && d.report) setState({ report: d.report, wmsScore: d.wms });
      else setErr(d.error || "Couldn't build the consult.");
    } catch { setErr("Couldn't build the consult."); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">{report ? "Your consult is ready. Regenerate any time." : "Pull it all together into your consult."}</div>
        <button onClick={run} disabled={busy} className="btn-primary text-sm">{busy ? "Consulting…" : report ? "Rebuild" : "Build my consult"}</button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}
      {report && (
        <>
          <ConsultReport report={report} wms={wms} />
          <Link href={`/consult/${code}`} className="btn-primary block text-center">View the full consult →</Link>
        </>
      )}
    </div>
  );
}
