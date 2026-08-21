"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Msg = { role: "user" | "assistant"; content: string };

const SILENCE_MS = 1600; // pause that ends your turn
const MAX_TURN_MS = 30000;

function pickVoice(voices: SpeechSynthesisVoice[]) {
  return (
    voices.find((v) => /en-US/i.test(v.lang) && /Google US English|Samantha|Aria|Jenny|Natural/i.test(v.name)) ||
    voices.find((v) => /en-US/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null
  );
}

// A chat with the AI counterpart that works in Text OR Voice. Shared by the
// negotiation and hard-conversation rooms. The parent owns the transcript and
// supplies onCall (its own reply endpoint); this handles the modality.
export default function RoleplayChat({
  chat,
  setChat,
  onCall,
  counterpartName,
  aiOpens = false,
  placeholder,
  emptyHint,
}: {
  chat: Msg[];
  setChat: (m: Msg[]) => void;
  onCall: (history: Msg[], onChunk?: (delta: string) => void) => Promise<string | null>;
  counterpartName: string;
  aiOpens?: boolean; // AI speaks first (negotiation) vs. user opens (hard convo)
  placeholder: string;
  emptyHint?: React.ReactNode;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [voice, setVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  const voiceRef = useRef(false); voiceRef.current = voice;
  const chatRef = useRef<Msg[]>(chat); chatRef.current = chat;
  const recRef = useRef<any>(null);
  const finalRef = useRef(""); const interimRef = useRef("");
  const silenceRef = useRef<any>(null); const maxRef = useRef<any>(null);
  const turnDone = useRef(false);
  const bestVoice = useRef<SpeechSynthesisVoice | null>(null);
  const opened = useRef(false);
  const finishRef = useRef<() => void>(() => {});
  const startListenRef = useRef<() => void>(() => {});

  const supported = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && !!window.speechSynthesis;

  const clearTimers = () => { clearTimeout(silenceRef.current); clearTimeout(maxRef.current); };

  const speak = useCallback((text: string, after?: () => void) => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!voiceRef.current || !synth) { after?.(); return; }
    try {
      synth.cancel();
      setSpeaking(true);
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.voice = bestVoice.current || pickVoice(synth.getVoices());
      let done = false;
      let keepAlive: any = null;
      const fin = () => { if (done) return; done = true; if (keepAlive) clearInterval(keepAlive); setSpeaking(false); after?.(); };
      const wd = setTimeout(() => { try { synth.cancel(); } catch {} fin(); }, Math.min(3500 + text.length * 65, 24000));
      u.onend = () => { clearTimeout(wd); fin(); };
      u.onerror = () => { clearTimeout(wd); fin(); };
      synth.speak(u);
      // iOS/Safari pauses long speech after ~15s; nudge it to keep going.
      keepAlive = setInterval(() => { try { synth.resume(); } catch {} }, 5000);
    } catch { setSpeaking(false); after?.(); }
  }, []);

  // iOS Safari blocks speechSynthesis until it's first called inside a user
  // gesture. Turning voice on is a tap, so speak a silent utterance there to
  // unlock audio; later (post-fetch) replies are then allowed to play.
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

  const runTurn = useCallback(async (userText: string | null) => {
    let history = chatRef.current;
    if (userText != null) { history = [...history, { role: "user", content: userText }]; setChat(history); }
    setBusy(true); setErr(null);
    // Stream the counterpart's reply into a live bubble as tokens arrive. Until
    // the first token lands, the "…" thinking indicator (busy) stays up.
    let acc = "";
    let started = false;
    const onChunk = (delta: string) => {
      acc += delta;
      if (!started) { started = true; setBusy(false); }
      setChat([...history, { role: "assistant", content: acc }]);
    };
    let reply: string | null = null;
    try {
      reply = await onCall(history, onChunk);
    } catch (e: any) {
      setBusy(false);
      setChat(history); // drop any partial bubble; keep the user's message
      setErr(e?.message || `Couldn't reach ${counterpartName}. Please try again.`);
      return;
    }
    setBusy(false);
    const finalText = (reply ?? acc).trim();
    if (!finalText) { if (voiceRef.current) startListenRef.current(); return; }
    setChat([...history, { role: "assistant", content: finalText }]);
    if (voiceRef.current) speak(finalText, () => startListenRef.current());
  }, [onCall, setChat, speak, counterpartName]);

  const startListening = useCallback(() => {
    const rec = recRef.current;
    if (!rec || !voiceRef.current) return;
    finalRef.current = ""; interimRef.current = ""; turnDone.current = false; setInterim("");
    clearTimers(); setListening(true);
    try { rec.start(); } catch {}
    maxRef.current = setTimeout(() => finishRef.current(), MAX_TURN_MS);
  }, []);
  startListenRef.current = startListening;

  const finishTurn = useCallback(() => {
    if (turnDone.current) return; turnDone.current = true;
    clearTimers(); setListening(false);
    try { recRef.current?.stop(); } catch {}
    const said = `${finalRef.current} ${interimRef.current}`.trim();
    finalRef.current = ""; interimRef.current = ""; setInterim("");
    if (said) runTurn(said); else if (voiceRef.current) startListening();
  }, [runTurn, startListening]);
  finishRef.current = finishTurn;

  // Set up recognition once.
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !window.speechSynthesis) return;
    const setV = () => { bestVoice.current = pickVoice(window.speechSynthesis.getVoices()); };
    setV(); window.speechSynthesis.onvoiceschanged = setV;
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      let itm = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + " "; else itm += r[0].transcript;
      }
      interimRef.current = itm; setInterim(itm);
      const heard = (finalRef.current + itm).trim().length > 0;
      clearTimeout(silenceRef.current);
      if (heard) silenceRef.current = setTimeout(() => finishRef.current(), SILENCE_MS);
    };
    rec.onend = () => { if (voiceRef.current && !turnDone.current) finishRef.current(); };
    rec.onerror = (e: any) => { if (e?.error === "not-allowed" || e?.error === "service-not-allowed") setErr("Microphone access is blocked. Allow the mic and reload."); };
    recRef.current = rec;
    return () => {
      try { rec.onresult = null; rec.onend = null; rec.onerror = null; rec.stop(); rec.abort(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
      clearTimers();
    };
  }, []);

  // Negotiation-style opener: AI speaks first if the transcript is empty.
  useEffect(() => {
    if (opened.current) return; opened.current = true;
    if (aiOpens && chat.length === 0) runTurn(null);
  }, []); // eslint-disable-line

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [chat.length, busy, interim]);

  function toggleVoice() {
    const on = !voice;
    setVoice(on); voiceRef.current = on;
    if (on) {
      unlockAudio(); // inside this tap, so iOS lets the counterpart speak
      const lastA = [...chatRef.current].reverse().find((m) => m.role === "assistant");
      if (lastA) speak(lastA.content, () => startListening()); else startListening();
    } else {
      clearTimers(); setListening(false); setSpeaking(false);
      try { recRef.current?.stop(); } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
    }
  }

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    runTurn(text);
  }

  const seg = (on: boolean) => "rounded-full px-3 py-1 text-xs font-semibold transition " + (on ? "bg-ink text-white" : "text-slate-500 hover:text-ink");

  return (
    <div className="card flex flex-col p-5" style={{ height: "60vh", minHeight: 440 }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">With {counterpartName}</div>
        <div className="flex items-center gap-1 rounded-full bg-mist p-0.5">
          <button onClick={() => voice && toggleVoice()} className={seg(!voice)}>Text</button>
          <button onClick={() => !voice && toggleVoice()} disabled={!supported} title={supported ? "" : "Voice needs Chrome or Safari"} className={seg(voice) + (supported ? "" : " opacity-40")}>🎙 Voice</button>
        </div>
      </div>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {chat.length === 0 && !busy && emptyHint && <div className="rounded-xl bg-mist p-4 text-sm text-slate-600">{emptyHint}</div>}
        {chat.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " + (m.role === "user" ? "bg-ink text-white" : "bg-slate-100 text-slate-800")}>{m.content}</div>
          </div>
        ))}
        {voice && interim && <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl bg-ink/60 px-4 py-2.5 text-sm italic text-white">{interim}…</div></div>}
        {busy && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400">…</div></div>}
      </div>

      {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {voice ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-mist px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <span className={"flex h-2.5 w-2.5 rounded-full " + (speaking ? "bg-amber" : listening ? "animate-pulse bg-sage" : "bg-slate-300")} />
            {speaking ? `${counterpartName} is speaking…` : listening ? "Listening — just talk" : busy ? "Thinking…" : "…"}
          </div>
          {speaking && <button onClick={() => { try { window.speechSynthesis.cancel(); } catch {} }} className="btn-ghost text-sm">Jump in →</button>}
          {listening && <button onClick={() => finishRef.current()} className="btn-ghost text-sm">Done speaking</button>}
        </div>
      ) : (
        <form onSubmit={sendText} className="mt-3 flex items-center gap-2">
          <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} disabled={busy} />
          <button className="btn-primary" disabled={busy || !input.trim()}>Send</button>
        </form>
      )}
    </div>
  );
}
