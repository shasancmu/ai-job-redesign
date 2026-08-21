"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { streamPost } from "@/lib/streamClient";
import InterviewHelper from "@/components/InterviewHelper";
import { CANVAS_STEPS, accentColor, type CanvasDef, type CanvasField } from "@/lib/canvases";
import Timer from "@/components/Timer";
import CanvasView from "@/components/CanvasView";
import FrontierPlot, { complexityLevel, QuadrantPlot } from "@/components/FrontierPlot";
import UnitEconomics from "@/components/UnitEconomics";
import { useT } from "@/components/I18nProvider";
import type { T } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };

// Translate with a fallback to the passed-in English: if the key is missing,
// show the original rather than a raw key.
function tf(t: T, key: string, fallback: string) {
  const v = t(key);
  return v === key ? fallback : v;
}

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
  const t = useT();
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
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
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
          {t("room.step", { n: phase + 1, total: CANVAS_STEPS.length })} · {t("catalog.min", { n: step.minutes })}
        </div>
        <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
      </div>

      <div className="pb-24">
        {step.key === "setup" && (
          <div className="space-y-4">
            {def.about && (
              <div className="rounded-2xl border border-line bg-mist p-5 text-sm leading-relaxed text-slate-600">
                <span className="font-semibold text-ink">{t("canvas.aboutLabel")}</span>
                {def.about}
              </div>
            )}
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
              {t("canvas.viewFull")} →
            </Link>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => go(phase - 1)} disabled={phase === 0} className="btn-ghost">{t("room.back")}</button>
          {phase < CANVAS_STEPS.length - 1 ? (
            <button onClick={() => go(phase + 1)} className="btn-primary">{t("room.next")} →</button>
          ) : (
            <Link href="/dashboard" className="btn-primary">{t("room.finish")}</Link>
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
  const t = useT();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const call = useCallback(
    async (history: Msg[]) => {
      setErr(null);
      setBusy(true);
      setStreaming("");
      let acc = "";
      try {
        const reply = await streamPost("/api/canvas/interview", { exercise: def.exercise, subject, messages: history }, (d) => { acc += d; setStreaming(acc); });
        return (reply || acc).trim() || null;
      } catch (e: any) {
        setErr(e?.message || t("canvas.aiUnavailable"));
        return null;
      } finally {
        setBusy(false);
        setStreaming("");
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
  }, [chat.length, busy, streaming]);

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
        {chat.length === 0 && busy && <div className="text-slate-400">{t("canvas.openingThinking")}</div>}
        {chat.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " + (m.role === "user" ? "bg-ink text-white" : "bg-slate-100 text-slate-800")}>
              {m.content}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-slate-800">{streaming}</div>
          </div>
        )}
        {busy && !streaming && chat.length > 0 && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div>
          </div>
        )}
      </div>
      {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      <InterviewHelper module={def.exercise} answered={chat.filter((m) => m.role === "user").length} hasDraft={!!input.trim()} onInsert={setInput} />
      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("room.typeAnswer")} disabled={busy} />
        <button className="btn-primary" disabled={busy || !input.trim()}>{t("room.send")}</button>
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
  const t = useT();
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
        const patch: Record<string, any> = {
          fields: { ...(canvas.fields || {}), ...(d.canvas.fields || {}) },
          synthesis: d.canvas.synthesis || "",
          verdict: d.canvas.verdict || "",
          score: d.canvas.score,
        };
        if (d.canvas.ratings) patch.ratings = d.canvas.ratings;
        if (d.canvas.frontier) patch.frontier = d.canvas.frontier;
        if (d.canvas.calc) patch.calc = d.canvas.calc;
        setCanvas(patch);
      } else {
        setErr(d.error || t("canvas.cantDraft"));
      }
    } catch {
      setErr(t("canvas.cantDraft"));
    }
    setBusy(false);
  }

  const groups = Array.from(new Set(def.fields.map((f) => f.group)));

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">{t("canvas.draftIntro")}</div>
        <button onClick={draft} disabled={busy} className="btn-primary text-sm">
          {busy ? t("canvas.drafting") : canvas.synthesis ? t("canvas.redraft") : t("room.draftWithAI")}
        </button>
      </div>
      {err && <p className="text-sm text-clay">{err}</p>}

      {canvas.synthesis && (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">{t("canvas.inShort")}</div>
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

      {def.frontier ? (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{def.frontier.heading || t("canvas.frontierHeading")}</div>
          {def.frontier.mode === "quadrant" ? (
            <div className="mt-3 grid gap-5 sm:grid-cols-2 sm:items-center">
              <QuadrantPlot fr={def.frontier} x={canvas.frontier?.x ?? 50} y={canvas.frontier?.y ?? 50} />
              <div className="space-y-4">
                <FrontierSlider
                  label={def.frontier.xLabel.replace(/[→↑]/g, "").trim()}
                  lo="low" hi="high"
                  value={canvas.frontier?.x ?? 50}
                  onChange={(v) => setCanvas({ frontier: { x: v, y: canvas.frontier?.y ?? 50 } })}
                />
                <FrontierSlider
                  label={def.frontier.yLabel.replace(/[→↑]/g, "").trim()}
                  lo="low" hi="high"
                  value={canvas.frontier?.y ?? 50}
                  onChange={(v) => setCanvas({ frontier: { x: canvas.frontier?.x ?? 50, y: v } })}
                />
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-500">{def.groupNotes?.["The frontier"]}</p>
              <div className="mt-3 grid gap-5 sm:grid-cols-2 sm:items-center">
                <FrontierPlot x={canvas.frontier?.x} y={canvas.frontier?.y} xLabel={def.frontier.xLabel} yLabel={def.frontier.yLabel} />
                <div className="space-y-4">
                  {(() => {
                    const c = complexityLevel(canvas.frontier?.x ?? 50, canvas.frontier?.y ?? 50);
                    return (
                      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ background: c.color }}>
                        {c.label}
                      </div>
                    );
                  })()}
                  <FrontierSlider
                    label={t("canvas.frontierGeneralityLabel")}
                    lo={t("canvas.frontierGeneralityLo")}
                    hi={t("canvas.frontierGeneralityHi")}
                    value={canvas.frontier?.x ?? 50}
                    onChange={(v) => setCanvas({ frontier: { x: v, y: canvas.frontier?.y ?? 50 } })}
                  />
                  <FrontierSlider
                    label={t("canvas.frontierAccuracyLabel")}
                    lo={t("canvas.frontierAccuracyLo")}
                    hi={t("canvas.frontierAccuracyHi")}
                    value={canvas.frontier?.y ?? 50}
                    onChange={(v) => setCanvas({ frontier: { x: canvas.frontier?.x ?? 50, y: v } })}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}

      {def.ratings?.length ? (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("canvas.scorecardHeading")}</div>
          <div className="mt-3 space-y-3.5">
            {def.ratings.map((r) => {
              const val = (canvas.ratings || {})[r.key] ?? 50;
              return (
                <div key={r.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{r.label}</span>
                    <span className="font-semibold text-ink">{val}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={val}
                    onChange={(e) => setCanvas({ ratings: { ...(canvas.ratings || {}), [r.key]: Number(e.target.value) } })}
                    className="mt-1 w-full accent-sage"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {def.calculator && (
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("canvas.unitEconHeading")}</div>
          <p className="mt-1 text-sm text-slate-500">{t("canvas.unitEconHint")}</p>
          <div className="mt-3">
            <UnitEconomics inputs={def.calculator.inputs} value={canvas.calc || {}} onChange={(calc) => setCanvas({ calc })} />
          </div>
        </div>
      )}

      {def.canvasTip && (
        <div className="rounded-2xl border border-line bg-mist p-5">
          <div className="text-sm font-semibold text-ink">{def.canvasTip.title}</div>
          <ul className="mt-2 space-y-1.5">
            {def.canvasTip.items.map((it, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <span className="text-sage">•</span>
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {groups.map((g) => {
        const note = def.frontier && g === "The frontier" ? null : def.groupNotes?.[g];
        return (
          <div key={g} className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{g}</div>
            {note && <p className="mt-1 text-sm text-slate-500">{note}</p>}
            <div className="mt-3 space-y-4">
              {def.fields.filter((f) => f.group === g).map((f) => (
                <FieldInput key={f.key} field={f} value={fields[f.key]} onChange={(v) => setField(f.key, v)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FrontierSlider({
  label,
  lo,
  hi,
  value,
  onChange,
}: {
  label: string;
  lo: string;
  hi: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const t = useT();
  return (
    <div>
      <div className="text-sm font-medium text-ink">{label}</div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-sage"
      />
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: CanvasField; value: any; onChange: (v: any) => void }) {
  const t = useT();
  const color = accentColor(field.accent);
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {field.label}
      </label>
      {field.hint && <div className="mt-0.5 text-xs text-slate-500">{field.hint}</div>}
      {field.kind === "pairs" ? (
        <PairsEditor field={field} value={Array.isArray(value) ? value : []} onChange={onChange} />
      ) : field.kind === "list" ? (
        <textarea
          className="field mt-1.5"
          placeholder={t("canvas.onePerLine")}
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

function PairsEditor({
  field,
  value,
  onChange,
}: {
  field: CanvasField;
  value: { a: string; b: string }[];
  onChange: (v: { a: string; b: string }[]) => void;
}) {
  const t = useT();
  const rows = value.length ? value : [{ a: "", b: "" }];
  const set = (i: number, patch: Partial<{ a: string; b: string }>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)).filter((r) => r.a || r.b));
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  return (
    <div className="mt-1.5 space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="field"
            placeholder={field.leftLabel || t("canvas.pairsLeft")}
            value={r.a}
            onChange={(e) => set(i, { a: e.target.value })}
          />
          <span className="text-slate-300">→</span>
          <input
            className="field"
            style={{ maxWidth: 150 }}
            placeholder={field.rightLabel || t("canvas.pairsRight")}
            value={r.b}
            onChange={(e) => set(i, { b: e.target.value })}
          />
          <button onClick={() => remove(i)} className="px-1 text-slate-400 hover:text-clay" title={t("canvas.remove")} type="button">
            ✕
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...value, { a: "", b: "" }])} className="text-sm text-slate2 hover:text-ink" type="button">
        + {t("canvas.add")}
      </button>
    </div>
  );
}

