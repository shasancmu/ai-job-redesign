"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { streamPost } from "@/lib/streamClient";
import ReportReveal from "@/components/ReportReveal";
import { usePredictGate } from "@/components/usePredictGate";
import { useT } from "@/components/I18nProvider";
import type { VoiceInterviewConfig } from "@/components/VoiceInterview";

type Msg = { role: "user" | "assistant"; content: string };
type Phase = "intro" | "speaking" | "listening" | "thinking" | "report" | "unsupported";

// OpenAI-powered twin of VoiceInterview. Same structure and UI, same /api route
// for the LLM turn and the report; only the voice I/O differs:
//   - speaking: OpenAI TTS (/api/voice/openai/tts) played back as audio
//   - listening: MediaRecorder captures the turn, a Web Audio meter endpoints on
//     silence (no tapping), then the clip is transcribed (/api/voice/openai/stt)
// The key never touches the browser; both voice routes hold it server-side.
const OPENAI_VOICES = ["sage", "alloy", "shimmer", "verse", "coral", "ash"] as const;
const SILENCE_MS = 1600;   // silence after speech that ends a turn
const MAX_TURN_MS = 30000; // hard cap on one answer
const MIN_SPEECH_MS = 350; // ignore a blip; require real speech before transcribing
const RMS_ON = 0.025;      // "speech" threshold on the mic meter

export default function VoiceInterviewOpenAI(cfg: VoiceInterviewConfig) {
  const t = useT();
  const { session, ws, apiPath } = cfg;
  const supabase = createClient();
  const [phase, setPhase] = useState<Phase>("intro");
  const [messages, setMessages] = useState<Msg[]>(ws.canvas?.interview_chat || []);
  const mref = useRef<Msg[]>(messages);
  const setM = (next: Msg[]) => { mref.current = next; setMessages(next); };
  const [caption, setCaption] = useState("");
  const [interim, setInterim] = useState(""); // transient status ("Transcribing…")
  const [report, setReport] = useState<any>(ws.canvas?.report || null);
  const [reportExtraData, setReportExtraData] = useState<any>(ws.canvas?.wmsScore ?? null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const [voice, setVoice] = useState<string>(ws.canvas?.openaiVoice || "sage");
  const voiceRef = useRef(voice);
  useEffect(() => { voiceRef.current = voice; }, [voice]);
  const [err, setErr] = useState<string | null>(null);
  const [build, setBuild] = useState<"idle" | "working" | "failed">("idle");
  const [buildStep, setBuildStep] = useState(0);
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    try { setIsIOS(/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)); } catch { /* no navigator */ }
  }, []);

  const gate = usePredictGate({ guideKey: cfg.guideKey, existing: ws.canvas?.prediction || null, save: (p) => saveCanvas({ prediction: p }), run: () => buildReport(), revealLabel: cfg.buildButtonLabel });

  // ---- audio plumbing ----
  const audioRef = useRef<HTMLAudioElement | null>(null); // reused element (unlocked once on iOS)
  const streamRef = useRef<MediaStream | null>(null);
  const acRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const vadRef = useRef<any>(null);
  const maxTurnRef = useRef<any>(null);
  const speechMsRef = useRef(0);
  const lastVoiceAtRef = useRef(0);
  const turnDoneRef = useRef(false);
  const runningRef = useRef(false);
  const deadRef = useRef(false);
  const handleUserRef = useRef<(t: string) => void>(() => {});
  const startListenRef = useRef<() => void>(() => {});

  const supported = typeof window !== "undefined" && !!(navigator.mediaDevices?.getUserMedia) && typeof (window as any).MediaRecorder !== "undefined";
  useEffect(() => { if (!supported) setPhase("unsupported"); }, [supported]);

  async function saveCanvas(patch: Record<string, any>) {
    const canvas = { ...(ws.canvas || {}), interview_chat: mref.current, openaiVoice: voiceRef.current, ...patch };
    ws.canvas = canvas;
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }

  const pickMime = () => {
    const MR: any = (window as any).MediaRecorder;
    for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
      try { if (MR?.isTypeSupported?.(m)) return m; } catch { /* ignore */ }
    }
    return "";
  };

  async function ensureMic(): Promise<MediaStream | null> {
    if (streamRef.current) return streamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ac = new AC();
      const src = ac.createMediaStreamSource(stream);
      const an = ac.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      acRef.current = ac;
      analyserRef.current = an;
      return stream;
    } catch {
      setErr("Microphone access is blocked. Allow the mic and reload.");
      return null;
    }
  }

  const clearTurnTimers = () => { clearInterval(vadRef.current); clearTimeout(maxTurnRef.current); };

  // ---- speaking (OpenAI TTS) ----
  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    if (deadRef.current || !runningRef.current) return;
    setCaption(text);
    setInterim("");
    setPhase("speaking");
    if (mutedRef.current) { onEnd?.(); return; }
    let done = false;
    const finish = () => { if (done) return; done = true; onEnd?.(); };
    try {
      const res = await fetch("/api/voice/openai/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: voiceRef.current }),
      });
      if (!runningRef.current || deadRef.current) return;
      if (!res.ok) { finish(); return; } // TTS down: show the caption, keep the interview moving
      const buf = await res.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      const a = audioRef.current || new Audio();
      audioRef.current = a;
      a.src = url;
      const cleanup = () => { try { URL.revokeObjectURL(url); } catch {} };
      const wd = setTimeout(() => { try { a.pause(); } catch {} cleanup(); finish(); }, Math.min(4000 + text.length * 70, 30000));
      a.onended = () => { clearTimeout(wd); cleanup(); finish(); };
      a.onerror = () => { clearTimeout(wd); cleanup(); finish(); };
      await a.play().catch(() => { clearTimeout(wd); cleanup(); finish(); });
    } catch { finish(); }
  }, []);

  // ---- listening (record + VAD endpointing) ----
  const finishTurn = useCallback(() => {
    if (turnDoneRef.current || !runningRef.current) return;
    turnDoneRef.current = true;
    clearTurnTimers();
    try { recRef.current?.stop(); } catch { /* onstop handles the rest */ }
  }, []);
  const finishTurnRef = useRef(finishTurn);
  useEffect(() => { finishTurnRef.current = finishTurn; }, [finishTurn]);

  const transcribe = useCallback(async (blob: Blob) => {
    setPhase("thinking");
    setInterim("Transcribing…");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "turn.webm");
      fd.append("language", "en");
      const res = await fetch("/api/voice/openai/stt", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      setInterim("");
      if (!runningRef.current || deadRef.current) return;
      const said = String(j?.text || "").trim();
      if (said) handleUserRef.current(said);
      else startListenRef.current(); // heard nothing usable, listen again
    } catch {
      setInterim("");
      if (runningRef.current) startListenRef.current();
    }
  }, []);

  const startListening = useCallback(async () => {
    if (deadRef.current || !runningRef.current) return;
    const stream = await ensureMic();
    if (!stream || !runningRef.current) return;
    const mime = pickMime();
    chunksRef.current = [];
    speechMsRef.current = 0;
    lastVoiceAtRef.current = 0;
    turnDoneRef.current = false;
    setInterim("");
    setCaption("");
    setPhase("listening");
    try { acRef.current?.resume?.(); } catch { /* ignore */ }

    let rec: MediaRecorder;
    try { rec = new (window as any).MediaRecorder(stream, mime ? { mimeType: mime } : undefined); }
    catch { setErr("Couldn't start recording."); return; }
    recRef.current = rec;
    rec.ondataavailable = (e: any) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      clearTurnTimers();
      const spoke = speechMsRef.current >= MIN_SPEECH_MS;
      const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
      chunksRef.current = [];
      if (!runningRef.current || deadRef.current) return;
      if (spoke && blob.size > 0) transcribe(blob);
      else startListenRef.current();
    };
    try { rec.start(); } catch { setErr("Couldn't start recording."); return; }

    // Silence endpointing off the live mic meter.
    const an = analyserRef.current;
    const buf = an ? new Uint8Array(an.fftSize) : null;
    let started = 0;
    vadRef.current = setInterval(() => {
      if (!an || !buf || turnDoneRef.current) return;
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      const now = Date.now();
      if (rms > RMS_ON) {
        if (!started) started = now;
        speechMsRef.current = now - started;
        lastVoiceAtRef.current = now;
      } else if (started && lastVoiceAtRef.current && now - lastVoiceAtRef.current > SILENCE_MS && speechMsRef.current >= MIN_SPEECH_MS) {
        finishTurnRef.current();
      }
    }, 100);
    maxTurnRef.current = setTimeout(() => finishTurnRef.current(), MAX_TURN_MS);
  }, [transcribe]);
  useEffect(() => { startListenRef.current = startListening; }, [startListening]);

  // ---- interview loop ----
  const fetchChat = useCallback(async (history: Msg[]): Promise<string | null> => {
    try {
      return await streamPost(apiPath, { mode: "chat", voice: true, messages: history, sessionId: session.id, ...cfg.chatExtra }, () => {});
    } catch (e: any) { setErr(e?.message || `The ${cfg.speaker} is unavailable.`); return null; }
  }, []); // eslint-disable-line

  const advisorTurn = useCallback(async (history: Msg[]) => {
    setPhase("thinking");
    const reply = await fetchChat(history);
    if (!runningRef.current) return;
    if (!reply) { startListening(); return; }
    const next = [...history, { role: "assistant" as const, content: reply }];
    setM(next);
    saveCanvas({});
    speak(reply, () => startListening());
  }, [fetchChat, speak, startListening]); // eslint-disable-line

  const handleUser = useCallback((text: string) => {
    const next = [...mref.current, { role: "user" as const, content: text }];
    setM(next);
    advisorTurn(next);
  }, [advisorTurn]);
  useEffect(() => { handleUserRef.current = handleUser; }, [handleUser]);

  useEffect(() => {
    if (build !== "working") { setBuildStep(0); return; }
    const id = setInterval(() => setBuildStep((s) => Math.min(s + 1, cfg.buildSteps.length - 1)), 6000);
    return () => clearInterval(id);
  }, [build]); // eslint-disable-line

  // Teardown: stop everything and release the mic.
  useEffect(() => {
    return () => {
      deadRef.current = true;
      runningRef.current = false;
      turnDoneRef.current = true;
      clearTurnTimers();
      try { recRef.current?.stop(); } catch {}
      try { audioRef.current?.pause(); } catch {}
      try { streamRef.current?.getTracks().forEach((tk) => tk.stop()); } catch {}
      try { acRef.current?.close?.(); } catch {}
    };
  }, []);

  function primeAudio() {
    // iOS/Safari only lets audio play if first triggered by a gesture. Create the
    // reused <audio> element and resume the context inside the Start tap.
    try {
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.play().catch(() => {});
      audioRef.current.pause();
      acRef.current?.resume?.();
    } catch { /* not supported */ }
  }

  async function start() {
    setErr(null);
    runningRef.current = true;
    primeAudio();
    const stream = await ensureMic(); // prompt for mic inside the gesture
    if (!stream) { runningRef.current = false; return; }
    if (mref.current.length > 0) {
      const lastA = [...mref.current].reverse().find((m) => m.role === "assistant");
      if (lastA) speak(lastA.content, () => startListening());
      else advisorTurn(mref.current);
      return;
    }
    advisorTurn([]);
  }

  function tapStatus() {
    if (phase === "speaking") { try { audioRef.current?.pause(); } catch {} startListening(); }
    else if (phase === "listening") { finishTurn(); }
  }

  function toggleMute() {
    const m = !muted;
    setMuted(m);
    mutedRef.current = m;
    if (m) { try { audioRef.current?.pause(); } catch {} }
  }

  function stopVoice() {
    runningRef.current = false;
    turnDoneRef.current = true;
    clearTurnTimers();
    setInterim("");
    try { recRef.current?.stop(); } catch {}
    try { audioRef.current?.pause(); } catch {}
  }

  async function buildReport() {
    stopVoice();
    setErr(null);
    setBuild("working");
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 75000);
    try {
      const res = await fetch(apiPath, {
        method: "POST", headers: { "Content-Type": "application/json" },
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
    } finally { clearTimeout(to); }
  }

  function keepTalking() {
    setBuild("idle");
    setErr(null);
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
        <div className="mt-5 h-1 w-40 overflow-hidden rounded-full bg-mist"><div className="build-bar h-full w-1/3 rounded-full bg-sky" /></div>
        <p className="mt-4 text-xs text-slate-400">This usually takes up to a minute. Your answers are saved.</p>
        <style>{`.voice-orb{width:132px;height:132px;border-radius:9999px;background:radial-gradient(circle at 40% 38%, color-mix(in srgb, var(--sky) 60%, white), color-mix(in srgb, var(--sage) 55%, white));animation:vo-breathe 1.4s ease-in-out infinite;opacity:.8}@keyframes vo-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}.build-bar{animation:bb 1.3s ease-in-out infinite}@keyframes bb{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}.build-line{animation:bl .5s ease-out}@keyframes bl{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>
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
        <Link href="/dashboard" className="mt-4 text-xs text-slate-400 hover:text-ink">← {t("room.exit")}</Link>
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
          <h1 className="mt-2 text-xl font-bold text-ink">This browser can&apos;t record audio</h1>
          <p className="mt-2 text-sm text-slate2">The spoken interview needs microphone recording, which this browser doesn&apos;t allow. Open it in a recent Chrome, Safari, Edge, or Firefox, or do the typed version instead.</p>
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
        <Link href="/dashboard" className="-m-2.5 inline-flex items-center rounded-lg p-2.5 text-sm text-slate2 hover:text-ink">← {t("room.exit")}</Link>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">{cfg.headerPill}</span>
        <button onClick={toggleMute} className="btn-ghost text-sm" title={muted ? `Unmute ${cfg.speaker}` : `Mute ${cfg.speaker}`}>{muted ? "🔇" : "🔊"}</button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {phase === "intro" ? (
          <div className="max-w-md">
            <div className={`voice-orb mx-auto ${orbState}`} />
            <h1 className="mt-8 text-2xl font-bold text-ink">{cfg.introTitle}</h1>
            <p className="mt-2 text-slate2">{cfg.introBody}</p>
            <div className="mt-5">
              <label className="lbl">Facilitator voice</label>
              <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                {OPENAI_VOICES.map((v) => (
                  <button key={v} onClick={() => setVoice(v)} className={"rounded-full px-3 py-1 text-sm capitalize transition " + (voice === v ? "bg-ink text-white" : "bg-mist text-slate-600 hover:bg-slate-200")}>{v}</button>
                ))}
              </div>
            </div>
            <div>
              <button onClick={start} className="btn-primary mt-6 px-8 py-3 text-base">{messages.length ? "Resume the interview" : "Start the interview"} →</button>
            </div>
            <p className="mt-3 text-xs text-slate-400">Powered by OpenAI&apos;s voice models. Your mic is used only while you&apos;re answering.</p>
            {isIOS && (
              <p className="mx-auto mt-2 max-w-xs rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">On iPhone: flip the side Silent switch off and turn the volume up, or you won&apos;t hear the {cfg.speaker}.</p>
            )}
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <button onClick={tapStatus} className={`voice-orb mx-auto ${orbState}`} aria-label="microphone" />
            <div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {phase === "speaking" ? `${cfg.speaker[0].toUpperCase() + cfg.speaker.slice(1)} speaking · tap to jump in` : phase === "listening" ? "Listening · just pause when you're done" : interim || "Thinking…"}
            </div>
            {caption && <p className="mx-auto mt-4 max-w-xl text-xl leading-relaxed text-ink">{caption}</p>}
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
