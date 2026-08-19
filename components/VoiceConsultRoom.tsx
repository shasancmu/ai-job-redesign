"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ConsultReport from "@/components/ConsultReport";

type Msg = { role: "user" | "assistant"; content: string };
type Phase = "intro" | "speaking" | "listening" | "thinking" | "report" | "unsupported";

// A spoken business interview. The advisor asks out loud (TTS), you answer out
// loud (STT), turn by turn, then it builds the consult. Browser Web Speech API,
// so no new backend, reuses /api/consult for the questions and the report.
export default function VoiceConsultRoom({ session, initialWorkspace }: { me: string; session: any; initialWorkspace: any }) {
  const supabase = createClient();
  const [ws] = useState<any>({ canvas: {}, ...initialWorkspace });
  const [phase, setPhase] = useState<Phase>("intro");
  const [messages, setMessages] = useState<Msg[]>(ws.canvas?.interview_chat || []);
  const mref = useRef<Msg[]>(messages);
  const setM = (next: Msg[]) => { mref.current = next; setMessages(next); };
  const [caption, setCaption] = useState("");
  const [interim, setInterim] = useState("");
  const [report, setReport] = useState<any>(ws.canvas?.report || null);
  const [wms, setWms] = useState<any>(ws.canvas?.wmsScore || null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const [err, setErr] = useState<string | null>(null);

  const recRef = useRef<any>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const turnDoneRef = useRef(false);
  const handleUserRef = useRef<(t: string) => void>(() => {});
  const startListenRef = useRef<() => void>(() => {});
  const supported = useRef(false);

  async function saveCanvas(patch: Record<string, any>) {
    const canvas = { ...(ws.canvas || {}), interview_chat: mref.current, ...patch };
    ws.canvas = canvas;
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }

  const speak = useCallback((text: string, onEnd?: () => void) => {
    setCaption(text);
    setPhase("speaking");
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (mutedRef.current || !synth) { onEnd?.(); return; }
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.pitch = 1;
      const vs = synth.getVoices();
      const pref = ["Samantha", "Google US English", "Microsoft Aria Online (Natural) - English (United States)", "Google UK English Female"];
      u.voice = pref.map((n) => vs.find((v) => v.name === n)).find(Boolean) || vs.find((v) => v.lang?.startsWith("en")) || null;
      u.onend = () => onEnd?.();
      u.onerror = () => onEnd?.();
      synth.speak(u);
    } catch {
      onEnd?.();
    }
  }, []);

  const startListening = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    finalRef.current = "";
    interimRef.current = "";
    turnDoneRef.current = false;
    setInterim("");
    setPhase("listening");
    try { rec.start(); } catch { /* already started */ }
  }, []);

  // Finish the current answer: stop the mic and submit whatever was heard.
  // Idempotent, so tapping + the browser's own onend can't double-fire.
  const finishTurn = useCallback(() => {
    if (turnDoneRef.current) return;
    turnDoneRef.current = true;
    try { recRef.current?.stop(); } catch {}
    const said = `${finalRef.current} ${interimRef.current}`.trim();
    interimRef.current = "";
    setInterim("");
    if (said) handleUserRef.current(said);
    else startListenRef.current();
  }, []);

  const fetchChat = useCallback(async (history: Msg[]): Promise<string | null> => {
    try {
      const res = await fetch("/api/consult", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "chat", messages: history, ctx: {} }) });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "The advisor is unavailable."); return null; }
      return d.reply as string;
    } catch { setErr("The advisor is unavailable."); return null; }
  }, []);

  const advisorTurn = useCallback(async (history: Msg[]) => {
    setPhase("thinking");
    const reply = await fetchChat(history);
    if (!reply) { setPhase("listening"); return; }
    const next = [...history, { role: "assistant" as const, content: reply }];
    setM(next);
    saveCanvas({});
    speak(reply, () => startListening());
  }, [fetchChat, speak, startListening]);

  const handleUser = useCallback((text: string) => {
    const next = [...mref.current, { role: "user" as const, content: text }];
    setM(next);
    advisorTurn(next);
  }, [advisorTurn]);

  // Keep the recognition handlers pointing at the latest callbacks.
  useEffect(() => { handleUserRef.current = handleUser; }, [handleUser]);
  useEffect(() => { startListenRef.current = startListening; }, [startListening]);

  // Set up speech recognition once.
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !window.speechSynthesis) { setPhase("unsupported"); return; }
    supported.current = true;
    // warm the voices list
    window.speechSynthesis.getVoices();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true; // stays on until we stop it, so tap-to-finish is deterministic
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      let itm = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + " ";
        else itm += r[0].transcript;
      }
      interimRef.current = itm;
      setInterim(itm);
    };
    rec.onend = () => { finishTurn(); };
    rec.onerror = (e: any) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") setErr("Microphone access is blocked. Allow the mic and reload.");
    };
    recRef.current = rec;
    return () => { try { rec.abort(); } catch {} window.speechSynthesis?.cancel(); };
  }, [finishTurn]);

  function start() {
    setErr(null);
    if (mref.current.length > 0) {
      // resume: re-ask the last advisor line, or continue listening
      const lastA = [...mref.current].reverse().find((m) => m.role === "assistant");
      if (lastA) speak(lastA.content, () => startListening());
      else advisorTurn(mref.current);
      return;
    }
    advisorTurn([]);
  }

  function tapStatus() {
    if (phase === "speaking") { window.speechSynthesis?.cancel(); startListening(); }
    else if (phase === "listening") { finishTurn(); }
  }

  function toggleMute() {
    const m = !muted;
    setMuted(m);
    mutedRef.current = m;
    if (m) window.speechSynthesis?.cancel();
  }

  async function buildConsult() {
    turnDoneRef.current = true; // stop the mic loop from re-listening after we abort
    try { recRef.current?.abort(); } catch {}
    window.speechSynthesis?.cancel();
    setPhase("thinking");
    setErr(null);
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "report", intake: {}, interview: mref.current, wms: { answers: {} }, eighty: {}, photos: [] }),
      });
      const d = await res.json();
      if (res.ok && d.report) {
        setReport(d.report);
        setWms(d.wms);
        await saveCanvas({ report: d.report, wmsScore: d.wms });
        await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
        setPhase("report");
      } else {
        setErr(d.error || "Couldn't build the consult.");
        setPhase("listening");
      }
    } catch {
      setErr("Couldn't build the consult.");
      setPhase("listening");
    }
  }

  const exchanges = messages.filter((m) => m.role === "user").length;

  // ---- Report ----
  if (phase === "report" && report) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Your consult</span>
          <Link href="/dashboard" className="btn-ghost text-sm">Done</Link>
        </div>
        <ConsultReport report={report} wms={wms} />
        <Link href={`/consult/${session.code}`} className="btn-primary mt-4 block text-center">View the full write-up →</Link>
      </main>
    );
  }

  // ---- Unsupported ----
  if (phase === "unsupported") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="card p-7 text-center">
          <div className="text-2xl">🎙️</div>
          <h1 className="mt-2 text-xl font-bold text-ink">Voice needs Chrome or Safari</h1>
          <p className="mt-2 text-sm text-slate2">This spoken interview uses your browser&apos;s built-in speech. Open it in Chrome or Safari, or do the typed version instead.</p>
          <Link href="/start/business-consult" className="btn-primary mt-5 inline-block text-sm">Do the typed consult</Link>
          <Link href="/dashboard" className="mt-3 block text-sm text-slate-400 hover:text-ink">← Dashboard</Link>
        </div>
      </main>
    );
  }

  const orbState = phase === "speaking" ? "speaking" : phase === "listening" ? "listening" : phase === "thinking" ? "thinking" : "idle";

  return (
    <div className="relative flex min-h-screen flex-col bg-paper">
      <header className="flex items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Talk through your business</span>
        <button onClick={toggleMute} className="btn-ghost text-sm" title={muted ? "Unmute advisor" : "Mute advisor"}>{muted ? "🔇" : "🔊"}</button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {phase === "intro" ? (
          <div className="max-w-md">
            <div className={`voice-orb mx-auto ${orbState}`} />
            <h1 className="mt-8 text-2xl font-bold text-ink">A spoken interview about your business</h1>
            <p className="mt-2 text-slate2">An advisor will ask you questions out loud. Just talk back, naturally. Find a quiet spot, and it works best in Chrome or Safari.</p>
            <button onClick={start} className="btn-primary mt-6 px-8 py-3 text-base">{messages.length ? "Resume the interview" : "Start the interview"} →</button>
            <p className="mt-3 text-xs text-slate-400">Your mic is used only while you&apos;re answering.</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <button onClick={tapStatus} className={`voice-orb mx-auto ${orbState}`} aria-label="microphone" />
            <div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {phase === "speaking" ? "Advisor speaking · tap to answer" : phase === "listening" ? "Listening · tap the circle when you're done" : "Thinking…"}
            </div>
            {caption && <p className="mx-auto mt-4 max-w-xl text-xl leading-relaxed text-ink">{caption}</p>}
            {interim && <p className="mx-auto mt-3 max-w-xl text-lg italic text-slate-400">{interim}</p>}
            {err && <div className="mx-auto mt-4 max-w-sm rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          </div>
        )}
      </div>

      {phase !== "intro" && (
        <div className="flex flex-col items-center gap-2 px-6 pb-8">
          <button onClick={buildConsult} disabled={exchanges < 2} className="btn-dark px-6 py-2.5 text-sm disabled:opacity-40">
            {exchanges < 2 ? "Answer a couple of questions first" : "End & build my consult →"}
          </button>
          <span className="text-xs text-slate-400">{exchanges} answered</span>
        </div>
      )}

      <style>{`
        .voice-orb { width: 132px; height: 132px; border-radius: 9999px; border: 0; cursor: pointer;
          background: radial-gradient(circle at 40% 38%, color-mix(in srgb, var(--sky) 60%, white), color-mix(in srgb, var(--sage) 55%, white));
          box-shadow: 0 10px 40px -10px color-mix(in srgb, var(--sky) 45%, transparent); transition: transform .3s; }
        .voice-orb.idle { animation: vo-breathe 4s ease-in-out infinite; }
        .voice-orb.speaking { animation: vo-speak 1.1s ease-in-out infinite; }
        .voice-orb.listening { animation: vo-listen 1.6s ease-in-out infinite; box-shadow: 0 0 0 0 color-mix(in srgb, var(--sage) 45%, transparent); }
        .voice-orb.thinking { animation: vo-breathe 1.4s ease-in-out infinite; opacity: .7; }
        @keyframes vo-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes vo-speak { 0%,100% { transform: scale(1); } 25% { transform: scale(1.09); } 60% { transform: scale(1.03); } }
        @keyframes vo-listen { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sage) 40%, transparent); } 70% { box-shadow: 0 0 0 26px color-mix(in srgb, var(--sage) 0%, transparent); } 100% { box-shadow: 0 0 0 0 transparent; } }
        @media (prefers-reduced-motion: reduce) { .voice-orb { animation: none !important; } }
      `}</style>
    </div>
  );
}
