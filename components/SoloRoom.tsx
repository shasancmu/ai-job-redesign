"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { streamPost } from "@/lib/streamClient";
import InterviewHelper from "@/components/InterviewHelper";
import { SOLO_STEPS } from "@/lib/solo";
import GridEditor from "@/components/GridEditor";
import Timer from "@/components/Timer";
import BuildPlan from "@/components/BuildPlan";
import { useT } from "@/components/I18nProvider";
import type { T } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };

// Translate with a fallback to the passed-in English (for step titles that live
// in lib/solo.ts): if the key is missing, show the original rather than a key.
function tf(t: T, key: string, fallback: string) {
  const v = t(key);
  return v === key ? fallback : v;
}

export default function SoloRoom({
  me,
  initialSession,
  initialWorkspace,
}: {
  me: string;
  initialSession: any;
  initialWorkspace: any;
}) {
  const supabase = createClient();
  const t = useT();
  const [session, setSession] = useState<any>(initialSession);
  const [ws, setWs] = useState<any>({
    grid: {},
    interview_chat: [],
    ...initialWorkspace,
  });
  const phase = session.phase ?? 0;
  const step = SOLO_STEPS[phase] ?? SOLO_STEPS[0];

  // ---- autosave workspace --------------------------------------------------
  const pending = useRef<Record<string, any>>({});
  const timer = useRef<any>(null);
  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    await supabase
      .from("workspaces")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", ws.id);
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

  async function goToPhase(i: number) {
    const clamped = Math.max(0, Math.min(SOLO_STEPS.length - 1, i));
    const status = clamped >= SOLO_STEPS.length - 1 ? "done" : "active";
    const now = new Date().toISOString();
    setSession((s: any) => ({ ...s, phase: clamped, phase_started_at: now, status }));
    await supabase
      .from("sessions")
      .update({ phase: clamped, phase_started_at: now, status })
      .eq("id", session.id);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600">
            ← {t("room.exit")}
          </Link>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold">
            {t("room.soloTag")}
          </span>
        </div>
        <Timer startedAt={session.phase_started_at} minutes={step.minutes} onReset={() => goToPhase(phase)} />
      </div>

      <div className="mb-6 flex items-center gap-1.5">
        {SOLO_STEPS.map((p) => (
          <button
            key={p.key}
            onClick={() => goToPhase(p.index)}
            className={
              "h-1.5 flex-1 rounded-full transition " +
              (p.index < phase ? "bg-ink" : p.index === phase ? "bg-ai" : "bg-slate-200 hover:bg-slate-300")
            }
          />
        ))}
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          {t("room.step", { n: phase + 1, total: SOLO_STEPS.length })} · {t("catalog.min", { n: step.minutes })}
        </div>
        <h1 className="mt-1 text-2xl font-bold">{tf(t, "steps.solo." + step.key + ".title", step.title)}</h1>
        <p className="mt-1 max-w-3xl text-slate-500">{tf(t, "steps.solo." + step.key + ".subtitle", step.subtitle)}</p>
      </div>

      <div className="pb-24">
        {step.key === "setup" && (
          <div className="card p-5">
            <label className="lbl">{t("solo.jobTitle")}</label>
            <input
              className="field"
              placeholder={t("solo.jobTitlePh")}
              value={ws.owner_job_title || ""}
              onChange={(e) => update({ owner_job_title: e.target.value })}
            />
            <label className="lbl mt-4">{t("solo.whatDoYouDo")}</label>
            <textarea
              className="field"
              placeholder={t("solo.whatDoYouDoPh")}
              value={ws.owner_job_description || ""}
              onChange={(e) => update({ owner_job_description: e.target.value })}
            />
          </div>
        )}

        {step.key === "interview" && (
          <Interview ws={ws} update={update} sessionId={session.id} />
        )}

        {step.key === "redesign" && (
          <Redesign ws={ws} update={update} session={session} />
        )}

        {step.key === "final" && (
          <div className="space-y-4">
            {ws.new_job_description && (
              <div className="card bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t("solo.reimaginedJob")}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-slate-600">{ws.new_job_description}</p>
              </div>
            )}
            <BuildPlan
              inline
              sessionId={session.id}
              code={session.code}
              jobTitle={ws.owner_job_title}
              jobDescription={ws.owner_job_description}
              grid={ws.grid || {}}
              initialPlan={ws.plan || null}
              onPlan={(plan) => update({ plan })}
            />
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => goToPhase(phase - 1)} disabled={phase === 0} className="btn-ghost">
            {t("room.back")}
          </button>
          {phase < SOLO_STEPS.length - 1 ? (
            <button onClick={() => goToPhase(phase + 1)} className="btn-primary">
              {t("room.next")} →
            </button>
          ) : (
            <Link href="/dashboard" className="btn-primary">
              {t("room.finish")}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Interview({ ws, update, sessionId }: { ws: any; update: (p: any) => void; sessionId: string }) {
  const t = useT();
  const messages: Msg[] = ws.interview_chat || [];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const job = { jobTitle: ws.owner_job_title, jobDescription: ws.owner_job_description };

  const call = useCallback(
    async (history: Msg[]) => {
      setErr(null);
      setBusy(true);
      setStreaming("");
      let acc = "";
      try {
        const reply = await streamPost("/api/interview", { mode: "chat", messages: history, ...job, sessionId }, (d) => { acc += d; setStreaming(acc); });
        return (reply || acc).trim() || null;
      } catch (e: any) {
        setErr(e?.message || t("room.aiUnavailable"));
        return null;
      } finally {
        setBusy(false);
        setStreaming("");
      }
    },
    [job.jobTitle, job.jobDescription]
  );

  // Kick off the first question once.
  useEffect(() => {
    if (started.current || messages.length > 0) {
      started.current = true;
      return;
    }
    started.current = true;
    call([]).then((reply) => {
      if (reply) update({ interview_chat: [{ role: "assistant", content: reply }] });
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy, streaming]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    update({ interview_chat: next });
    setInput("");
    const reply = await call(next);
    if (reply) update({ interview_chat: [...next, { role: "assistant", content: reply }] });
  }

  return (
    <div className="card flex flex-col p-5" style={{ height: "60vh", minHeight: 420 }}>
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && busy && (
          <div className="text-slate-400">{t("solo.openingQ")}</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " +
                (m.role === "user" ? "bg-ink text-white" : "bg-slate-100 text-slate-800")
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-slate-800">{streaming}</div>
          </div>
        )}
        {busy && !streaming && messages.length > 0 && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div>
          </div>
        )}
      </div>

      {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      <InterviewHelper module="job" answered={messages.filter((m) => m.role === "user").length} hasDraft={!!input.trim()} onInsert={setInput} />
      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <input
          className="field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("room.typeAnswer")}
          disabled={busy}
        />
        <button className="btn-primary" disabled={busy || !input.trim()}>
          {t("room.send")}
        </button>
      </form>
    </div>
  );
}

function Redesign({ ws, update, session }: { ws: any; update: (p: any) => void; session: any }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);

  async function draft() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "propose",
          messages: ws.interview_chat || [],
          jobTitle: ws.owner_job_title,
          jobDescription: ws.owner_job_description,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || t("solo.cantDraft"));
        return;
      }
      update({ grid: data.grid || {}, new_job_description: data.new_job_description || "" });
      setRationale(data.rationale || null);
    } catch {
      setErr("Couldn't draft a redesign.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-500">
          {t("solo.splitIntro")}
        </div>
        <button onClick={draft} disabled={busy} className="btn-primary">
          {busy ? t("room.thinking") : t("room.draftWithAI")}
        </button>
      </div>
      {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      {rationale && (
        <div className="card p-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-sage">{t("solo.whySplit")}</div>
          <p className="text-sm leading-relaxed text-slate2">{rationale}</p>
        </div>
      )}

      <GridEditor grid={ws.grid || {}} onChange={(grid) => update({ grid })} />

      <div className="card p-5">
        <label className="lbl">{t("solo.newJobLabel")}</label>
        <textarea
          className="field min-h-[130px]"
          placeholder={t("solo.newJobPh")}
          value={ws.new_job_description || ""}
          onChange={(e) => update({ new_job_description: e.target.value })}
        />
      </div>

      <p className="text-center text-sm text-slate2">
        {t("solo.nextPlan")}
      </p>
    </div>
  );
}
