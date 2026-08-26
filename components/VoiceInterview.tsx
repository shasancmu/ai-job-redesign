"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { streamPost } from "@/lib/streamClient";
import ReportReveal from "@/components/ReportReveal";
import { usePredictGate } from "@/components/usePredictGate";
import { pickBestVoice } from "@/lib/voices";
import { useVoices } from "@/components/useVoices";
import VoicePicker from "@/components/VoicePicker";

type Msg = { role: "user" | "assistant"; content: string };
type Phase = "intro" | "speaking" | "listening" | "thinking" | "report" | "unsupported";

// The shared spoken-interview engine: browser TTS asks out loud, STT hears the
// answer with silence endpointing (no tapping), a watchdog so a stuck TTS can't
// hang it, and the mic is released on exit. The subject-specific bits (which
// API, what to send/build, the report, labels) come in as props. Intake, if any,
// is handled by the wrapper before this mounts.
export type VoiceInterviewConfig = {
  session: any;
  ws: any;
  apiPath: string;
  chatExtra: Record<string, any>;
  reportExtra: Record<string, any>;
  guideKey?: string;
  renderReport: (report: any, extra: any) => ReactNode;
  reportHref: (code: string) => string;
  reportLinkLabel: string;
  reportPill: string;
  buildSteps: string[];
  buildTitle: string;
  buildNoun: string; // "consult" / "changes" — used in copy
  speaker: string; // "advisor" / "coach"
  headerPill: string;
  introTitle: string;
  introBody: string;
  typedLabel: string;
  typedHref: string;
  buildButtonLabel: string;
};

export default function VoiceInterview(cfg: VoiceInterviewConfig) {
  const { session, ws, apiPath } = cfg;
  const supabase = createClient();
  const [phase, setPhase] = useState<Phase>("intro");
  const [messages, setMessages] = useState<Msg[]>(ws.canvas?.interview_chat || []);
  const mref = useRef<Msg[]>(messages);
  const setM = (next: Msg[]) => { mref.current = next; setMessages(next); };
  const [caption, setCaption] = useState("");
  const [interim, setInterim] = useState("");
  const [report, setReport] = useState<any>(ws.canvas?.report || null);
  const [reportExtraData, setReportExtraData] = useState<any>(ws.canvas?.wmsScore ?? null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const [err, setErr] = useState<string | null>(null);
  const [build, setBuild] = useState<"idle" | "working" | "failed">("idle");
  const [buildStep, setBuildStep] = useState(0);
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    try { setIsIOS(/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)); } catch { /* no navigator */ }
  }, []);

  const { voices, voiceName, voiceRef, chooseVoice } = useVoices(mutedRef);
  const gate = usePredictGate({ guideKey: cfg.guideKey, existing: ws.canvas?.prediction || null, save: (p) => saveCanvas({ prediction: p }), run: () => buildReport(), revealLabel: cfg.buildButtonLabel });

  const recRef = useRef<any>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const turnDoneRef = useRef(false);
  const handleUserRef = useRef<(t: string) => void>(() => {});
  const startListenRef = useRef<() => void>(() => {});
  const finishTurnRef = useRef<() => void>(() => {});
  const supported = useRef(false);
  // The interview loop only runs while this is true. Building the report (or any
  // exit) flips it false so a late speak()/advisorTurn callback can't restart the
  // mic or ask another question.
  const runningRef = useRef(false);

  const SILENCE_MS = 2300;
  const MAX_TURN_MS = 30000;
  const silenceRef = useRef<any>(null);
  const maxTurnRef = useRef<any>(null);
  const deadRef = useRef(false);
  const clearTurnTimers = () => { clearTimeout(silenceRef.current); clearTimeout(maxTurnRef.current); };

  async function saveCanvas(patch: Record<string, any>) {
    const canvas = { ...(ws.canvas || {}), interview_chat: mref.current, ...patch };
    ws.canvas = canvas;
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (deadRef.current || !runningRef.current) return;
    setCaption(text);
    setPhase("speaking");
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (mutedRef.current || !synth) { onEnd?.(); return; }
    let done = false;
    let keepAlive: any = null;
    const finish = () => { if (done) return; done = true; if (keepAlive) clearInterval(keepAlive); onEnd?.(); };
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.98;
      u.pitch = 1;
      u.voice = voiceRef.current || pickBestVoice(synth.getVoices());
      const est = Math.min(3500 + text.length * 65, 24000);
      const wd = setTimeout(() => { try { synth.cancel(); } catch {} finish(); }, est);
      u.onend = () => { clearTimeout(wd); finish(); };
      u.onerror = () => { clearTimeout(wd); finish(); };
      synth.speak(u);
      // iOS/Safari silently pauses speech after ~15s; nudge it to keep going.
      keepAlive = setInterval(() => { try { synth.resume(); } catch {} }, 5000);
    } catch {
      finish();
    }
  }, []);

  // iOS Safari blocks speechSynthesis unless it is first invoked from inside a
  // user gesture. Our first spoken reply arrives after a fetch (not a gesture),
  // so on the opening tap we speak a silent utterance to unlock audio; every
  // later speak() is then allowed to play. Harmless on other browsers.
  function unlockAudio() {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      synth.speak(u);
      synth.resume();
    } catch { /* not supported */ }
  }

  const startListening = useCallback(() => {
    const rec = recRef.current;
    if (!rec || deadRef.current || !runningRef.current) return;
    finalRef.current = "";
    interimRef.current = "";
    turnDoneRef.current = false;
    clearTurnTimers();
    setInterim("");
    setPhase("listening");
    try { rec.start(); } catch { /* already started */ }
    maxTurnRef.current = setTimeout(() => finishTurnRef.current(), MAX_TURN_MS);
  }, []);

  const finishTurn = useCallback(() => {
    if (turnDoneRef.current || !runningRef.current) return;
    turnDoneRef.current = true;
    clearTurnTimers();
    try { recRef.current?.stop(); } catch {}
    const said = `${finalRef.current} ${interimRef.current}`.trim();
    interimRef.current = "";
    setInterim("");
    if (said) handleUserRef.current(said);
    else startListenRef.current();
  }, []);

  const fetchChat = useCallback(async (history: Msg[]): Promise<string | null> => {
    try {
      // The route streams, but a spoken turn is read aloud whole, so we just
      // collect the full reply (no incremental TTS, which would sound broken).
      const reply = await streamPost(apiPath, { mode: "chat", voice: true, messages: history, sessionId: session.id, ...cfg.chatExtra }, () => {});
      return reply;
    } catch (e: any) { setErr(e?.message || `The ${cfg.speaker} is unavailable.`); return null; }
  }, []); // eslint-disable-line

  const advisorTurn = useCallback(async (history: Msg[]) => {
    setPhase("thinking");
    const reply = await fetchChat(history);
    if (!runningRef.current) return; // report build (or exit) happened mid-request
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

  useEffect(() => { handleUserRef.current = handleUser; }, [handleUser]);
  useEffect(() => { startListenRef.current = startListening; }, [startListening]);
  useEffect(() => { finishTurnRef.current = finishTurn; }, [finishTurn]);

  useEffect(() => {
    if (build !== "working") { setBuildStep(0); return; }
    const id = setInterval(() => setBuildStep((s) => Math.min(s + 1, cfg.buildSteps.length - 1)), 6000);
    return () => clearInterval(id);
  }, [build]); // eslint-disable-line

  // Set up speech recognition once.
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !window.speechSynthesis) { setPhase("unsupported"); return; }
    supported.current = true;
    deadRef.current = false;
    window.speechSynthesis.getVoices();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
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
      const heard = (finalRef.current + itm).trim().length > 0;
      clearTimeout(silenceRef.current);
      if (heard) silenceRef.current = setTimeout(() => finishTurnRef.current(), SILENCE_MS);
    };
    rec.onend = () => { finishTurnRef.current(); };
    rec.onerror = (e: any) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") setErr("Microphone access is blocked. Allow the mic and reload.");
    };
    recRef.current = rec;
    return () => {
      deadRef.current = true;
      turnDoneRef.current = true;
      clearTurnTimers();
      try { rec.onresult = null; rec.onend = null; rec.onerror = null; } catch {}
      try { rec.stop(); } catch {}
      try { rec.abort(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  function start() {
    setErr(null);
    unlockAudio(); // must run inside this tap so iOS lets the AI speak
    runningRef.current = true;
    if (mref.current.length > 0) {
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

  // Stop the interview loop immediately: the mic and any TTS. Runs the moment the
  // build button is tapped (before the predict modal), so listening and speaking
  // never continue behind it, and again when the report actually builds.
  function stopVoice() {
    runningRef.current = false;
    turnDoneRef.current = true;
    clearTurnTimers();
    setInterim("");
    try { recRef.current?.stop(); } catch {}
    try { recRef.current?.abort(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
  }

  async function buildReport() {
    stopVoice();
    setErr(null);
    setBuild("working");
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 75000);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "report", interview: mref.current, sessionId: session.id, ...cfg.reportExtra }),
        signal: ctl.signal,
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.report) {
        setReport(d.report);
        setReportExtraData(d.wms ?? null);
        await saveCanvas({ report: d.report, ...(d.wms !== undefined ? { wmsScore: d.wms } : {}) });
        await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
        setBuild("idle");
        setPhase("report");
      } else {
        setErr(d.error || `Couldn't build the ${cfg.buildNoun}. Your answers are saved, try again.`);
        setBuild("failed");
      }
    } catch (e: any) {
      setErr(e?.name === "AbortError" ? "That took too long. Your answers are saved, try again." : `Couldn't reach the ${cfg.speaker}. Your answers are saved, try again.`);
      setBuild("failed");
    } finally {
      clearTimeout(t);
    }
  }

  function keepTalking() {
    setBuild("idle");
    setErr(null);
    unlockAudio();
    runningRef.current = true;
    turnDoneRef.current = false;
    startListening();
  }

  const exchanges = messages.filter((m) => m.role === "user").length;

  // ---- Building ----
  if (build === "working") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="voice-orb thinking" />
        <h1 className="mt-8 text-2xl font-bold text-ink">{cfg.buildTitle}</h1>
        <p key={buildStep} className="build-line mt-2 min-h-[1.5rem] text-slate2">{cfg.buildSteps[buildStep]}</p>
        <div className="mt-5 h-1 w-40 overflow-hidden rounded-full bg-mist">
          <div className="build-bar h-full w-1/3 rounded-full bg-sky" />
        </div>
        <p className="mt-4 text-xs text-slate-400">This usually takes up to a minute. Your answers are saved.</p>
        <style>{`
          .voice-orb { width: 132px; height: 132px; border-radius: 9999px; background: radial-gradient(circle at 40% 38%, color-mix(in srgb, var(--sky) 60%, white), color-mix(in srgb, var(--sage) 55%, white)); animation: vo-breathe 1.4s ease-in-out infinite; opacity: .8; }
          @keyframes vo-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
          .build-bar { animation: bb 1.3s ease-in-out infinite; }
          @keyframes bb { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
          .build-line { animation: bl .5s ease-out; }
          @keyframes bl { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        `}</style>
      </main>
    );
  }

  if (build === "failed") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="text-3xl">😕</div>
        <h1 className="mt-3 text-xl font-bold text-ink">That didn&apos;t go through</h1>
        <p className="mt-2 text-sm text-slate2">{err || `Couldn't build the ${cfg.buildNoun}.`}</p>
        <button onClick={buildReport} className="btn-primary mt-5 px-6 py-2.5 text-sm">Try building again →</button>
        <button onClick={keepTalking} className="btn-ghost mt-2 text-sm">Keep talking instead</button>
        <Link href="/dashboard" className="mt-4 text-xs text-slate-400 hover:text-ink">← Exit</Link>
      </main>
    );
  }

  // ---- Report ----
  if (phase === "report" && report) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{cfg.reportPill}</span>
          <Link href="/dashboard" className="btn-ghost text-sm">Done</Link>
        </div>
        <ReportReveal guideKey={cfg.guideKey} prediction={gate.prediction} code={session.code}>
          {cfg.renderReport(report, reportExtraData)}
        </ReportReveal>
        <Link href={cfg.reportHref(session.code)} className="btn-primary mt-4 block text-center no-print">{cfg.reportLinkLabel}</Link>
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
          <Link href={cfg.typedHref} className="btn-primary mt-5 inline-block text-sm">{cfg.typedLabel}</Link>
          <Link href="/dashboard" className="mt-3 block text-sm text-slate-400 hover:text-ink">← Dashboard</Link>
        </div>
      </main>
    );
  }

  const orbState = phase === "speaking" ? "speaking" : phase === "listening" ? "listening" : phase === "thinking" ? "thinking" : "idle";

  return (
    <div className="relative flex min-h-screen flex-col bg-paper">
      {gate.modal}
      <header className="flex items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{cfg.headerPill}</span>
        <button onClick={toggleMute} className="btn-ghost text-sm" title={muted ? `Unmute ${cfg.speaker}` : `Mute ${cfg.speaker}`}>{muted ? "🔇" : "🔊"}</button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {phase === "intro" ? (
          <div className="max-w-md">
            <div className={`voice-orb mx-auto ${orbState}`} />
            <h1 className="mt-8 text-2xl font-bold text-ink">{cfg.introTitle}</h1>
            <p className="mt-2 text-slate2">{cfg.introBody}</p>
            <VoicePicker voices={voices} voiceName={voiceName} onChoose={chooseVoice} />
            <div>
              <button onClick={start} className="btn-primary mt-6 px-8 py-3 text-base">{messages.length ? "Resume the interview" : "Start the interview"} →</button>
            </div>
            <p className="mt-3 text-xs text-slate-400">Voices marked ★ are the highest quality. Your mic is used only while you&apos;re answering.</p>
            {isIOS && (
              <p className="mx-auto mt-2 max-w-xs rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                On iPhone: flip the side Silent switch off and turn the volume up, or you won&apos;t hear the {cfg.speaker}.
              </p>
            )}
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <button onClick={tapStatus} className={`voice-orb mx-auto ${orbState}`} aria-label="microphone" />
            <div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {phase === "speaking" ? `${cfg.speaker[0].toUpperCase() + cfg.speaker.slice(1)} speaking · tap to jump in` : phase === "listening" ? "Listening · just pause when you're done" : "Thinking…"}
            </div>
            {caption && <p className="mx-auto mt-4 max-w-xl text-xl leading-relaxed text-ink">{caption}</p>}
            {interim && <p className="mx-auto mt-3 max-w-xl text-lg italic text-slate-400">{interim}</p>}
            {err && <div className="mx-auto mt-4 max-w-sm rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          </div>
        )}
      </div>

      {phase !== "intro" && (
        <div className="flex flex-col items-center gap-2 px-6 pb-8">
          <button onClick={() => { stopVoice(); gate.start(); }} disabled={exchanges < 2} className="btn-dark px-6 py-2.5 text-sm disabled:opacity-40">
            {exchanges < 2 ? "Answer a couple of questions first" : cfg.buildButtonLabel}
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
