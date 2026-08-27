"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { streamPost } from "@/lib/streamClient";
import { pickBestVoice } from "@/lib/voices";

type Msg = { role: "user" | "assistant"; content: string };
type Phase = "intro" | "speaking" | "listening" | "thinking" | "unsupported";

// The census management interview, using the robust spoken-interview engine from
// the resume/consult modules: browser TTS asks out loud, STT hears the answer
// with silence endpointing, a watchdog so a stuck TTS can't hang it, iOS audio
// unlocked on the start tap, and the mic released on exit. Transcript is kept in
// `chat` for the flow to score and submit.
const STT_LANG: Record<string, string> = { en: "en-US", ur: "ur-PK", lud: "en-US" };
const SILENCE_MS = 2300;
const MAX_TURN_MS = 30000;

export default function CensusVoiceInterview({ chat, setChat, lang = "en" }: { chat: Msg[]; setChat: (m: Msg[]) => void; lang?: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [caption, setCaption] = useState("");
  const [interim, setInterim] = useState("");
  const [muted, setMuted] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mref = useRef<Msg[]>(chat); mref.current = chat;
  const mutedRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const recRef = useRef<any>(null);
  const finalRef = useRef(""); const interimRef = useRef("");
  const turnDoneRef = useRef(false);
  const runningRef = useRef(false);
  const deadRef = useRef(false);
  const silenceRef = useRef<any>(null); const maxTurnRef = useRef<any>(null);
  const keepAliveRef = useRef<any>(null);
  const handleUserRef = useRef<(t: string) => void>(() => {});
  const startListenRef = useRef<() => void>(() => {});
  const finishTurnRef = useRef<() => void>(() => {});

  const clearTurnTimers = () => { clearTimeout(silenceRef.current); clearTimeout(maxTurnRef.current); };

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (deadRef.current || !runningRef.current) return;
    setCaption(text); setPhase("speaking");
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (mutedRef.current || !synth) { onEnd?.(); return; }
    let done = false;
    const finish = () => { if (done) return; done = true; clearInterval(keepAliveRef.current); onEnd?.(); };
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.98; u.voice = voiceRef.current || pickBestVoice(synth.getVoices());
      const wd = setTimeout(() => { try { synth.cancel(); } catch {} finish(); }, Math.min(3500 + text.length * 65, 24000));
      u.onend = () => { clearTimeout(wd); finish(); };
      u.onerror = () => { clearTimeout(wd); finish(); };
      synth.speak(u);
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = setInterval(() => { try { synth.resume(); } catch {} }, 5000);
    } catch { finish(); }
  }, []);

  function unlockAudio() {
    try { const s = window.speechSynthesis; if (!s) return; const u = new SpeechSynthesisUtterance(" "); u.volume = 0; s.speak(u); s.resume(); } catch {}
  }

  const startListening = useCallback(() => {
    const rec = recRef.current;
    if (!rec || deadRef.current || !runningRef.current) return;
    finalRef.current = ""; interimRef.current = ""; turnDoneRef.current = false;
    clearTurnTimers(); setInterim(""); setPhase("listening");
    try { rec.start(); } catch {}
    maxTurnRef.current = setTimeout(() => finishTurnRef.current(), MAX_TURN_MS);
  }, []);

  const finishTurn = useCallback(() => {
    if (turnDoneRef.current || !runningRef.current) return;
    turnDoneRef.current = true;
    clearTurnTimers();
    try { recRef.current?.stop(); } catch {}
    const said = `${finalRef.current} ${interimRef.current}`.trim();
    interimRef.current = ""; setInterim("");
    if (said) handleUserRef.current(said); else startListenRef.current();
  }, []);

  const advisorTurn = useCallback(async (history: Msg[]) => {
    setPhase("thinking");
    let reply: string | null = null;
    try { reply = await streamPost("/api/census/interview", { messages: history, lang }, () => {}); }
    catch { setErr("The interviewer is unavailable. You can type instead."); setPhase("listening"); return; }
    if (!runningRef.current) return;
    if (!reply) { setPhase("listening"); return; }
    const next = [...history, { role: "assistant" as const, content: reply }];
    setChat(next);
    speak(reply, () => startListening());
  }, [lang, speak, startListening, setChat]);

  const handleUser = useCallback((text: string) => {
    const next = [...mref.current, { role: "user" as const, content: text }];
    setChat(next);
    advisorTurn(next);
  }, [advisorTurn, setChat]);

  useEffect(() => { handleUserRef.current = handleUser; }, [handleUser]);
  useEffect(() => { startListenRef.current = startListening; }, [startListening]);
  useEffect(() => { finishTurnRef.current = finishTurn; }, [finishTurn]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !window.speechSynthesis) { setPhase("unsupported"); return; }
    deadRef.current = false;
    window.speechSynthesis.getVoices();
    const rec = new SR();
    rec.lang = STT_LANG[lang] || "en-US";
    rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      let itm = "";
      for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) finalRef.current += r[0].transcript + " "; else itm += r[0].transcript; }
      interimRef.current = itm; setInterim(itm);
      const heard = (finalRef.current + itm).trim().length > 0;
      clearTimeout(silenceRef.current);
      if (heard) silenceRef.current = setTimeout(() => finishTurnRef.current(), SILENCE_MS);
    };
    rec.onend = () => { finishTurnRef.current(); };
    rec.onerror = (e: any) => { if (e?.error === "not-allowed" || e?.error === "service-not-allowed") setErr("Microphone access is blocked. Allow the mic and reload."); };
    recRef.current = rec;
    return () => {
      deadRef.current = true; runningRef.current = false; turnDoneRef.current = true;
      clearTurnTimers(); clearInterval(keepAliveRef.current);
      try { rec.onresult = null; rec.onend = null; rec.onerror = null; rec.stop(); rec.abort(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, [lang]);

  function start() {
    setErr(null); unlockAudio(); runningRef.current = true;
    if (mref.current.length > 0) {
      const lastA = [...mref.current].reverse().find((m) => m.role === "assistant");
      if (lastA) speak(lastA.content, () => startListening()); else advisorTurn(mref.current);
    } else advisorTurn([]);
  }

  function tapStatus() {
    if (phase === "speaking") { window.speechSynthesis?.cancel(); startListening(); }
    else if (phase === "listening") finishTurn();
  }
  function toggleMute() { const m = !muted; setMuted(m); mutedRef.current = m; if (m) window.speechSynthesis?.cancel(); }

  const answered = chat.filter((m) => m.role === "user").length;
  const orb = phase === "speaking" ? "speaking" : phase === "listening" ? "listening" : phase === "thinking" ? "thinking" : "idle";

  if (phase === "unsupported") {
    return <div className="card p-6 text-center text-sm text-slate-600">Voice needs Chrome or Safari. Go back and choose the multiple-choice option instead.</div>;
  }

  return (
    <div className="card flex flex-col items-center p-6 text-center">
      {phase === "intro" ? (
        <>
          <div className="cv-orb idle" />
          <p className="mt-4 text-sm text-slate-600">A short spoken conversation about how you run the business. The interviewer talks; you answer out loud. Just pause when you are done speaking.</p>
          <button onClick={start} className="btn-primary mt-4 px-6 py-2.5 text-sm">{chat.length ? "Resume" : "Start"} the interview →</button>
          <p className="mt-2 text-xs text-slate-400">Your mic is used only while you are answering.</p>
        </>
      ) : (
        <>
          <div className="flex w-full items-center justify-end"><button onClick={toggleMute} className="btn-ghost text-xs">{muted ? "🔇" : "🔊"}</button></div>
          <button onClick={tapStatus} className={`cv-orb ${orb}`} aria-label="microphone" />
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {phase === "speaking" ? "Interviewer speaking · tap to jump in" : phase === "listening" ? "Listening · pause when you're done" : "Thinking…"}
          </div>
          {caption && <p className="mt-3 text-base leading-relaxed text-ink">{caption}</p>}
          {interim && <p className="mt-2 text-sm italic text-slate-400">{interim}</p>}
          {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <p className="mt-3 text-xs text-slate-400">{answered} answered · tap Next below when you're done</p>
        </>
      )}
      <style>{`
        .cv-orb { width: 104px; height: 104px; border-radius: 9999px; border: 0; cursor: pointer;
          background: radial-gradient(circle at 40% 38%, color-mix(in srgb, var(--sky) 60%, white), color-mix(in srgb, var(--sage) 55%, white));
          box-shadow: 0 10px 40px -10px color-mix(in srgb, var(--sky) 45%, transparent); }
        .cv-orb.idle { animation: cvb 4s ease-in-out infinite; }
        .cv-orb.speaking { animation: cvs 1.1s ease-in-out infinite; }
        .cv-orb.listening { animation: cvl 1.6s ease-in-out infinite; }
        .cv-orb.thinking { animation: cvb 1.4s ease-in-out infinite; opacity: .7; }
        @keyframes cvb { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes cvs { 0%,100% { transform: scale(1); } 25% { transform: scale(1.09); } 60% { transform: scale(1.03); } }
        @keyframes cvl { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sage) 40%, transparent); } 70% { box-shadow: 0 0 0 22px color-mix(in srgb, var(--sage) 0%, transparent); } 100% { box-shadow: 0 0 0 0 transparent; } }
        @media (prefers-reduced-motion: reduce) { .cv-orb { animation: none !important; } }
      `}</style>
    </div>
  );
}
