"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { streamPost } from "@/lib/streamClient";
import { pickBestVoice } from "@/lib/voices";
import { useT } from "@/components/I18nProvider";

type Msg = { role: "user" | "assistant"; content: string };
const API = "/api/mechanics/authoring-interview";
const SILENCE_MS = 2300;
const MAX_TURN_MS = 30000;

// A short, stateless interview that helps an instructor decide what module to
// build (and fills in the details). Text or voice (the orb does the talking).
// When they're ready, it synthesizes the conversation into module options and
// hands them back to the caller, which runs the existing generation.
export default function AuthoringInterview({ sourceText, onDone, onCancel }: {
  sourceText?: string;
  onDone: (options: any[], transcript: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [mode, setMode] = useState<"pick" | "text" | "voice">("pick");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [input, setInput] = useState("");
  const [building, setBuilding] = useState(false);
  const [err, setErr] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const answered = messages.filter((m) => m.role === "user").length;

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [messages, streaming, waiting]);

  // Stream the next question. Returns the full text (also for the voice loop).
  const ask = useCallback(async (history: Msg[], voice: boolean): Promise<string> => {
    setWaiting(true); setErr(""); setStreaming("");
    let acc = "";
    try {
      const full = await streamPost(API, { mode: "chat", voice, messages: history, sourceText }, (d) => { acc += d; if (!voice) setStreaming(acc); });
      const text = (full || acc).trim();
      if (text) { setMessages([...history, { role: "assistant", content: text }]); return text; }
      setErr("The interviewer is unavailable. Try again.");
    } catch (e: any) { setErr(e?.message || "Connection hiccup. Try again."); }
    finally { setWaiting(false); setStreaming(""); }
    return "";
  }, [sourceText]);

  async function report() {
    stopVoice(); // wrap up: silence the mic + speech immediately, before the round-trip
    setBuilding(true); setErr("");
    try {
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "report", messages, sourceText }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(d.options) && d.options.length) { onDone(d.options, d.transcript || ""); return; }
      setErr(d.error || "Not quite enough yet. Say a little more, then try again.");
    } catch { setErr("Couldn't build ideas. Try again."); }
    setBuilding(false);
  }

  // ---------------- text ----------------
  function send() {
    const text = input.trim();
    if (!text || waiting) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    ask(next, false);
  }

  // ---------------- voice (Web Speech, ported from the proven loop) ----------------
  const recRef = useRef<any>(null);
  const runningRef = useRef(false);
  const deadRef = useRef(false);
  const mref = useRef<Msg[]>([]);
  const voiceRef = useRef<any>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const turnDoneRef = useRef(false);
  const silenceRef = useRef<any>(null);
  const maxTurnRef = useRef<any>(null);
  const [vphase, setVphase] = useState<"intro" | "speaking" | "listening" | "thinking" | "unsupported">("intro");
  const [caption, setCaption] = useState("");
  const [interim, setInterim] = useState("");
  const handleUserRef = useRef<(t: string) => void>(() => {});
  const startListenRef = useRef<() => void>(() => {});
  const finishTurnRef = useRef<() => void>(() => {});

  useEffect(() => { mref.current = messages; }, [messages]);

  const clearTurnTimers = () => { clearTimeout(silenceRef.current); clearTimeout(maxTurnRef.current); };

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (deadRef.current || !runningRef.current) return;
    setCaption(text); setVphase("speaking");
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth) { onEnd?.(); return; }
    let done = false; let keepAlive: any = null;
    const finish = () => { if (done) return; done = true; if (keepAlive) clearInterval(keepAlive); onEnd?.(); };
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.98; u.voice = voiceRef.current || pickBestVoice(synth.getVoices());
      const wd = setTimeout(() => { try { synth.cancel(); } catch {} finish(); }, Math.min(3500 + text.length * 65, 24000));
      u.onend = () => { clearTimeout(wd); finish(); };
      u.onerror = () => { clearTimeout(wd); finish(); };
      synth.speak(u);
      keepAlive = setInterval(() => { try { synth.resume(); } catch {} }, 5000);
    } catch { finish(); }
  }, []);

  const startListening = useCallback(() => {
    const rec = recRef.current;
    if (!rec || deadRef.current || !runningRef.current) return;
    finalRef.current = ""; interimRef.current = ""; turnDoneRef.current = false;
    clearTurnTimers(); setInterim(""); setVphase("listening");
    try { rec.start(); } catch {}
    maxTurnRef.current = setTimeout(() => finishTurnRef.current(), MAX_TURN_MS);
  }, []);

  const advisorTurn = useCallback(async (history: Msg[]) => {
    setVphase("thinking");
    const reply = await ask(history, true);
    if (!runningRef.current) return;
    if (!reply) { setVphase("listening"); return; }
    speak(reply, () => startListening());
  }, [ask, speak, startListening]);

  const handleUser = useCallback((text: string) => {
    const next = [...mref.current, { role: "user" as const, content: text }];
    setMessages(next);
    advisorTurn(next);
  }, [advisorTurn]);

  const finishTurn = useCallback(() => {
    if (turnDoneRef.current || !runningRef.current) return;
    turnDoneRef.current = true; clearTurnTimers();
    try { recRef.current?.stop(); } catch {}
    const said = `${finalRef.current} ${interimRef.current}`.trim();
    interimRef.current = ""; setInterim("");
    if (said) handleUserRef.current(said); else startListenRef.current();
  }, []);

  useEffect(() => { handleUserRef.current = handleUser; }, [handleUser]);
  useEffect(() => { startListenRef.current = startListening; }, [startListening]);
  useEffect(() => { finishTurnRef.current = finishTurn; }, [finishTurn]);

  function stopVoice() {
    runningRef.current = false; deadRef.current = true; clearTurnTimers();
    try { recRef.current?.stop(); recRef.current?.abort(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
  }

  function startVoice() {
    setMode("voice");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !window.speechSynthesis) { setVphase("unsupported"); return; }
    // Unlock iOS audio inside this tap gesture.
    try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); window.speechSynthesis.resume(); } catch {}
    voiceRef.current = pickBestVoice(window.speechSynthesis.getVoices());
    deadRef.current = false; runningRef.current = true;
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      let itm = "";
      for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) finalRef.current += r[0].transcript + " "; else itm += r[0].transcript; }
      interimRef.current = itm; setInterim(itm);
      clearTimeout(silenceRef.current);
      if ((finalRef.current + itm).trim()) silenceRef.current = setTimeout(() => finishTurnRef.current(), SILENCE_MS);
    };
    rec.onend = () => finishTurnRef.current();
    rec.onerror = (e: any) => { if (e?.error === "not-allowed" || e?.error === "service-not-allowed") setErr("Microphone access is blocked. Allow the mic and reload."); };
    recRef.current = rec;
    advisorTurn([]); // ask + speak the first question, then listen
  }

  useEffect(() => () => stopVoice(), []);

  // ---------------- render ----------------
  if (mode === "pick") {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
          <div className="text-3xl">🎙️</div>
          <h1 className="mt-2 font-serif text-2xl text-ink">Let&apos;s figure out your module</h1>
          <p className="mt-2 text-sm text-slate2">{sourceText ? "I read your materials. A few questions and I'll propose what to build." : "No materials needed. A few questions and I'll propose what to build."}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button onClick={() => { setMode("text"); ask([], false); }} className="rounded-2xl border border-line bg-white p-5 text-left transition hover:border-ai hover:shadow-sm">
              <div className="text-2xl">⌨️</div><div className="mt-2 text-sm font-bold text-ink">Type it</div><div className="text-xs text-slate-500">A quick back-and-forth chat.</div>
            </button>
            <button onClick={startVoice} className="rounded-2xl border border-line bg-white p-5 text-left transition hover:border-ai hover:shadow-sm">
              <div className="text-2xl">🔵</div><div className="mt-2 text-sm font-bold text-ink">Talk it through</div><div className="text-xs text-slate-500">Hands-free, by voice. Chrome or Safari.</div>
            </button>
          </div>
          <button onClick={onCancel} className="mt-5 text-xs text-slate-400 hover:text-ink">← Back</button>
        </div>
      </div>
    );
  }

  if (mode === "voice") {
    if (vphase === "unsupported") {
      return (
        <div className="mx-auto max-w-lg text-center">
          <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
            <p className="text-sm text-slate2">Voice needs Chrome or Safari. You can type instead.</p>
            <button onClick={() => { stopVoice(); setMode("text"); ask([], false); }} className="btn-primary mt-4 text-sm">Type instead</button>
          </div>
        </div>
      );
    }
    const label = vphase === "speaking" ? "Speaking…" : vphase === "listening" ? "Listening…" : "Thinking…";
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center py-6 text-center">
        <button className={`voice-orb ${vphase}`} onClick={() => { if (vphase === "listening") finishTurn(); }} aria-label="Voice interview" />
        <div className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <p className="mt-2 min-h-[3rem] max-w-md text-[15px] leading-relaxed text-ink">{interim || caption}</p>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        <div className="mt-6 flex items-center gap-3">
          <button onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
          <button onClick={report} disabled={building || answered < 2} className="btn-primary text-sm disabled:opacity-40">{building ? "Reading…" : "See what I can build →"}</button>
        </div>
        {answered < 2 && <p className="mt-2 text-xs text-slate-400">Answer a couple of questions first.</p>}
      </div>
    );
  }

  // text
  return (
    <div className="mx-auto flex h-[70vh] max-w-2xl flex-col rounded-2xl border border-line bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <button onClick={onCancel} className="text-sm text-slate2 hover:text-ink">← Back</button>
        <span className="text-sm font-semibold text-ink">Let&apos;s design your module</span>
        <button onClick={report} disabled={building || answered < 2} className="btn-dark px-3 py-1.5 text-xs disabled:opacity-40">{building ? "Reading…" : answered < 2 ? "Keep going" : "See what I can build"}</button>
      </header>
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={"max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed " + (m.role === "user" ? "rounded-br-sm bg-ink text-white" : "rounded-bl-sm bg-mist text-ink")}>{m.content}</div>
          </div>
        ))}
        {streaming && <div className="flex justify-start"><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-mist px-4 py-2.5 text-[15px] leading-relaxed text-ink">{streaming}</div></div>}
        {waiting && !streaming && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-sm bg-mist px-4 py-3 text-slate-400">…</div></div>}
        {err && <div className="mx-auto max-w-sm rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">{err}</div>}
      </div>
      <div className="border-t border-line px-3 py-3">
        <div className="flex items-end gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={t("room.typeAnswer")} className="field max-h-32 flex-1 resize-none py-2.5" disabled={waiting} />
          <button onClick={send} disabled={waiting || !input.trim()} className="btn-primary shrink-0 px-4 py-2.5 disabled:opacity-40">{t("room.send")}</button>
        </div>
      </div>
    </div>
  );
}
