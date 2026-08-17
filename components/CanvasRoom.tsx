"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CANVAS_STEPS, accentColor, type CanvasDef, type CanvasField } from "@/lib/canvases";
import Timer from "@/components/Timer";
import CanvasView from "@/components/CanvasView";

type Msg = { role: "user" | "assistant"; content: string };

export default function CanvasRoom({
  me,
  session,
  def,
  initialWorkspace,
}: {
  me: string;
  session: any;
  def: CanvasDef;
  initialWorkspace: any;
}) {
  const supabase = createClient();
  const [phase, setPhase] = useState<number>(session.phase || 0);
  const [startedAt, setStartedAt] = useState(session.phase_started_at || new Date().toISOString());
  const [ws, setWs] = useState<any>({ canvas: {}, ...initialWorkspace });
  const canvas = ws.canvas || {};
  const step = CANVAS_STEPS[phase] ?? CANVAS_STEPS[0];

  // ---- autosave workspace --------------------------------------------------
  const pending = useRef<Record<string, any>>({});
  const timer = useRef<any>(null);
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    await supabase.from("workspaces").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }, [supabase, ws.id]);
  const update = useCallback(
    (patch: Record<string, any>) => {
      setWs((w: any) => ({ ...w, ...patch }));
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 500);
    },
    [flush]
  );
  const setCanvas = (patch: Record<string, any>) => update({ canvas: { ...canvas, ...patch } });

  async function go(i: number) {
    const clamped = Math.max(0, Math.min(CANVAS_STEPS.length - 1, i));
    const status = clamped >= CANVAS_STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setPhase(clamped);
    setStartedAt(now);
    await supabase.from("sessions").update({ phase: clamped, phase_started_at: now, status }).eq("id", session.id);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{def.name}</span>
        </div>
        <Timer startedAt={startedAt} minutes={step.minutes} onReset={() => setStartedAt(new Date().toISOString())} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {CANVAS_STEPS.map((p, i) => (
          <button
            key={p.key}
            onClick={() => go(i)}
            className={"h-1.5 flex-1 rounded-full transition " + (i < phase ? "bg-ink" : i === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")}
          />
        ))}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Step {phase + 1} of {CANVAS_STEPS.length} · {step.minutes} min
        </div>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
      </div>

      <div className="pb-24">
        {step.key === "setup" && (
          <div className="card p-5">
            <label className="lbl">{def.setupTitle}</label>
            <textarea
              className="field min-h-[90px]"
              placeholder={def.setupPlaceholder}
              value={canvas.subject || ""}
              onChange={(e) => setCanvas({ subject: e.target.value })}
            />
            <p className="mt-2 text-sm text-slate-500">{def.setupHint}</p>
          </div>
        )}

        {step.key === "interview" && (
          <Interview def={def} subject={canvas.subject} chat={canvas.chat || []} setChat={(c) => setCanvas({ chat: c })} />
        )}

        {step.key === "canvas" && (
          <CanvasStep def={def} subject={canvas.subject} chat={canvas.chat || []} canvas={canvas} setCanvas={setCanvas} />
        )}

        {step.key === "artifact" && (
          <div className="space-y-4">
            <CanvasView def={def} canvas={canvas} embedded />
            <Link href={`/canvas/${session.code}`} className="btn-primary block text-center">
              View the full canvas →
            </Link>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">Back</button>
          {phase < CANVAS_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">Next step →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">Finish</Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Interview({
  def,
  subject,
  chat,
  setChat,
}: {
  def: CanvasDef;
  subject?: string;
  chat: Msg[];
  setChat: (m: Msg[]) => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const call = useCallback(
    async (history: Msg[]) => {
      setErr(null);
      setBusy(true);
      try {
        const res = await fetch("/api/canvas/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exercise: def.exercise, subject, messages: history }),
        });
        const d = await res.json();
        if (!res.ok) {
          setErr(d.error || "The AI is unavailable.");
          return null;
        }
        return d.reply as string;
      } catch {
        setErr("The AI is unavailable.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [def.exercise, subject]
  );

  useEffect(() => {
    if (started.current || chat.length > 0) {
      started.current = true;
      return;
    }
    started.current = true;
    call([]).then((reply) => {
      if (reply) setChat([{ role: "assistant", content: reply }]);
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [chat.length, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...chat, { role: "user", content: text }];
    setChat(next);
    setInput("");
    const reply = await call(next);
    if (reply) setChat([...next, { role: "assistant", content: reply }]);
  }

  return (
    <div className="card flex flex-col p-5" style={{ height: "58vh", minHeight: 400 }}>
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {chat.length === 0 && busy && <div className="text-slate-400">Your AI partner is thinking of an opening question…</div>}
        {chat.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " + (m.role === "user" ? "bg-ink text-white" : "bg-slate-100 text-slate-800")}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && chat.length > 0 && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div>
          </div>
        )}
      </div>
      {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" disabled={busy} />
        <button className="btn-primary" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}

function CanvasStep({
  def,
  subject,
  chat,
  canvas,
  setCanvas,
}: {
  def: CanvasDef;
  subject?: string;
  chat: Msg[];
  canvas: any;
  setCanvas: (p: Record<string, any>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fields: Record<string, any> = canvas.fields || {};
  const setField = (key: string, val: any) => setCanvas({ fields: { ...fields, [key]: val } });

  async function draft() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/canvas/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise: def.exercise, subject, messages: chat }),
      });
      const d = await res.json();
      if (res.ok && d.canvas) {
        setCanvas({
          fields: { ...(canvas.fields || {}), ...(d.canvas.fields || {}) },
          synthesis: d.canvas.synthesis || "",
          verdict: d.canvas.verdict || "",
          score: d.canvas.score,
        });
      } else {
        setErr(d.error || "Couldn't draft — fill it in by hand.");
      }
    } catch {
      setErr("Couldn't draft — fill it in by hand.");
    }
    setBusy(false);
  }

  const groups = Array.from(new Set(def.fields.map((f) => f.group)));

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">Let AI draft the canvas from your interview — then make every line yours.</div>
        <button onClick={draft} disabled={busy} className="btn-primary text-sm">
          {busy ? "Drafting…" : canvas.synthesis ? "↻ Redraft" : "✨ Draft with AI"}
        </button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}

      {canvas.synthesis && (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">In short</div>
          <p className="mt-1 leading-relaxed text-slate-700">{canvas.synthesis}</p>
          {def.hasVerdict && canvas.verdict && (
            <p className="mt-2 font-semibold text-ink">{canvas.verdict}</p>
          )}
          {def.hasScore && typeof canvas.score === "number" && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>{def.hasScore.label}</span>
                <span className="font-semibold text-ink">{canvas.score}/100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${canvas.score}%`, background: "linear-gradient(90deg,#CE8F2C,#3F7A52)" }} />
              </div>
            </div>
          )}
        </div>
      )}

      {groups.map((g) => (
        <div key={g} className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{g}</div>
          <div className="mt-3 space-y-4">
            {def.fields.filter((f) => f.group === g).map((f) => (
              <FieldInput key={f.key} field={f} value={fields[f.key]} onChange={(v) => setField(f.key, v)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: CanvasField; value: any; onChange: (v: any) => void }) {
  const color = accentColor(field.accent);
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {field.label}
      </label>
      {field.hint && <div className="mt-0.5 text-xs text-slate-500">{field.hint}</div>}
      {field.kind === "list" ? (
        <textarea
          className="field mt-1.5"
          placeholder="One per line…"
          value={Array.isArray(value) ? value.join("\n") : ""}
          onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
        />
      ) : field.kind === "long" ? (
        <textarea className="field mt-1.5" value={value || ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="field mt-1.5" value={value || ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
