"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ResumeSource } from "@/lib/resume";
import ResumeIntake from "@/components/ResumeIntake";
import ResumeReport from "@/components/ResumeReport";
import ShareReport from "@/components/ShareReport";

type Msg = { role: "user" | "assistant"; content: string };
type Phase = "intake" | "intro" | "speaking" | "listening" | "thinking" | "report" | "unsupported";

// Voice résumé interview. Same browser-speech engine as the voice consult
// (silence endpointing so there's no tapping, a TTS watchdog so it can't hang,
// and the mic is released on exit), wired to /api/resume and the résumé report.
const TOP_TIER = /(enhanced|premium|neural|natural|siri)/i;
const GOOD_NAME = /(enhanced|premium|neural|natural|siri|ava|zoe|serena|samantha|allison|nicky|evan|nathan|jenny|aria|guy|sonia|libby|ryan|google us english|google uk english female)/i;
const BAD_NAME = /(compact|eloquence|espeak|zira|david|mark|hazel|novelty|whisper|bells|bad news|good news|bubbles|deranged|hysterical|trinoids|albert|junior|ralph|fred|organ|cellos|zarvox|wobble|boing|superstar|bahh|jester|rocko|shelley|grandma|grandpa|reed|flo|sandy|rishi)/i;

function scoreVoice(v: SpeechSynthesisVoice): number {
  let s = 0;
  const lang = (v.lang || "").toLowerCase();
  if (lang.startsWith("en-us")) s += 3;
  else if (lang.startsWith("en-gb") || lang.startsWith("en-au")) s += 2;
  else if (lang.startsWith("en")) s += 1;
  if (TOP_TIER.test(v.name)) s += 6;
  else if (GOOD_NAME.test(v.name)) s += 4;
  if (v.localService === false) s += 1;
  if (BAD_NAME.test(v.name)) s -= 8;
  return s;
}
function englishVoices(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const en = list.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
  return (en.length ? en : list).slice().sort((a, b) => scoreVoice(b) - scoreVoice(a));
}
function pickBestVoice(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return englishVoices(list)[0] || null;
}

const BUILD_STEPS = [
  "Reading your résumé and everything you told me…",
  "Finding the wins that are under-sold…",
  "Turning duties into measurable accomplishments…",
  "Drafting stronger bullets and a new summary…",
  "Putting your changes together…",
];

export default function VoiceResumeRoom({ session, initialWorkspace, prefill, prefillFrom }: { session: any; initialWorkspace: any; prefill?: string; prefillFrom?: string }) {
  const supabase = createClient();
  const [ws] = useState<any>({ canvas: {}, ...initialWorkspace });
  const [source, setSource] = useState<ResumeSource | null>(ws.canvas?.source || null);
  const [phase, setPhase] = useState<Phase>(ws.canvas?.source ? "intro" : "intake");
  const [messages, setMessages] = useState<Msg[]>(ws.canvas?.interview_chat || []);
  const mref = useRef<Msg[]>(messages);
  const setM = (next: Msg[]) => { mref.current = next; setMessages(next); };
  const [caption, setCaption] = useState("");
  const [interim, setInterim] = useState("");
  const [report, setReport] = useState<any>(ws.canvas?.report || null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const [err, setErr] = useState<string | null>(null);
  const [build, setBuild] = useState<"idle" | "working" | "failed">("idle");
  const [buildStep, setBuildStep] = useState(0);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const recRef = useRef<any>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const turnDoneRef = useRef(false);
  const handleUserRef = useRef<(t: string) => void>(() => {});
  const startListenRef = useRef<() => void>(() => {});
  const finishTurnRef = useRef<() => void>(() => {});
  const deadRef = useRef(false);
  const supported = useRef(false);

  const SILENCE_MS = 2300;
  const MAX_TURN_MS = 30000;
  const silenceRef = useRef<any>(null);
  const maxTurnRef = useRef<any>(null);
  const clearTurnTimers = () => { clearTimeout(silenceRef.current); clearTimeout(maxTurnRef.current); };

  async function saveCanvas(patch: Record<string, any>) {
    const canvas = { ...(ws.canvas || {}), interview_chat: mref.current, ...patch };
    ws.canvas = canvas;
    await supabase.from("workspaces").update({ canvas, updated_at: new Date().toISOString() }).eq("id", ws.id);
  }

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (deadRef.current) return;
    setCaption(text);
    setPhase("speaking");
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (mutedRef.current || !synth) { onEnd?.(); return; }
    let done = false;
    const finish = () => { if (done) return; done = true; onEnd?.(); };
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
    } catch { finish(); }
  }, []);

  const startListening = useCallback(() => {
    const rec = recRef.current;
    if (!rec || deadRef.current) return;
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
    if (turnDoneRef.current) return;
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
      const res = await fetch("/api/resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "chat", voice: true, messages: history, source }) });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "The coach is unavailable."); return null; }
      return d.reply as string;
    } catch { setErr("The coach is unavailable."); return null; }
  }, [source]);

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

  useEffect(() => { handleUserRef.current = handleUser; }, [handleUser]);
  useEffect(() => { startListenRef.current = startListening; }, [startListening]);
  useEffect(() => { finishTurnRef.current = finishTurn; }, [finishTurn]);

  useEffect(() => {
    if (build !== "working") { setBuildStep(0); return; }
    const id = setInterval(() => setBuildStep((s) => Math.min(s + 1, BUILD_STEPS.length - 1)), 6000);
    return () => clearInterval(id);
  }, [build]);

  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth) return;
    const load = () => {
      const list = synth.getVoices();
      if (!list.length) return;
      setVoices(list);
      const saved = typeof localStorage !== "undefined" ? localStorage.getItem("voice-consult-voice") : "";
      const chosen = (saved && list.find((v) => v.name === saved)) || pickBestVoice(list);
      if (chosen) { voiceRef.current = chosen; setVoiceName(chosen.name); }
    };
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => synth.removeEventListener?.("voiceschanged", load);
  }, []);

  function chooseVoice(name: string) {
    const v = voices.find((x) => x.name === name) || null;
    voiceRef.current = v;
    setVoiceName(name);
    try { localStorage.setItem("voice-consult-voice", name); } catch {}
    const synth = window.speechSynthesis;
    if (v && synth && !mutedRef.current) {
      synth.cancel();
      const u = new SpeechSynthesisUtterance("Great, this is the voice I'll use.");
      u.voice = v; u.rate = 0.98;
      synth.speak(u);
    }
  }

  // Set up recognition once we're past intake.
  useEffect(() => {
    if (phase === "intake") return;
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
  }, [phase === "intake"]); // eslint-disable-line

  async function startInterview(s: ResumeSource) {
    setSource(s);
    await saveCanvas({ source: s });
    setPhase("intro");
  }

  function start() {
    setErr(null);
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

  async function buildChanges() {
    turnDoneRef.current = true;
    clearTurnTimers();
    try { recRef.current?.abort(); } catch {}
    window.speechSynthesis?.cancel();
    setErr(null);
    setBuild("working");
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 75000);
    try {
      const res = await fetch("/api/resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "report", source, interview: mref.current }), signal: ctl.signal });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.report) {
        setReport(d.report);
        await saveCanvas({ report: d.report });
        await supabase.from("sessions").update({ status: "done" }).eq("id", session.id);
        setBuild("idle");
        setPhase("report");
      } else { setErr(d.error || "Couldn't build the changes. Your answers are saved, try again."); setBuild("failed"); }
    } catch (e: any) {
      setErr(e?.name === "AbortError" ? "That took too long. Your answers are saved, try again." : "Couldn't reach the coach. Your answers are saved, try again.");
      setBuild("failed");
    } finally { clearTimeout(t); }
  }

  function keepTalking() { setBuild("idle"); setErr(null); startListening(); }

  const exchanges = messages.filter((m) => m.role === "user").length;

  // ---- Intake ----
  if (phase === "intake") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-slate2 hover:text-ink">← Exit</Link>
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Talk Through Your Résumé</span>
        </div>
        <ResumeIntake prefill={prefill} prefillFrom={prefillFrom} onStart={startInterview} cta="Start the spoken interview" />
      </main>
    );
  }

  // ---- Building ----
  if (build === "working") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="voice-orb thinking" />
        <h1 className="mt-8 text-2xl font-bold text-ink">Building your changes</h1>
        <p key={buildStep} className="build-line mt-2 min-h-[1.5rem] text-slate2">{BUILD_STEPS[buildStep]}</p>
        <p className="mt-4 text-xs text-slate-400">This usually takes up to a minute. Your answers are saved.</p>
        <style>{`
          .voice-orb { width: 132px; height: 132px; border-radius: 9999px; background: radial-gradient(circle at 40% 38%, color-mix(in srgb, var(--sky) 60%, white), color-mix(in srgb, var(--sage) 55%, white)); animation: vo-breathe 1.4s ease-in-out infinite; opacity: .8; }
          @keyframes vo-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
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
        <p className="mt-2 text-sm text-slate2">{err || "Couldn't build the changes."}</p>
        <button onClick={buildChanges} className="btn-primary mt-5 px-6 py-2.5 text-sm">Try building again →</button>
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
          <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Your résumé changes</span>
          <div className="flex items-center gap-2">
            <ShareReport code={session.code} title="Résumé changes" text="Here are the changes to make to my résumé, from Superadditive:" />
            <Link href="/dashboard" className="btn-ghost text-sm">Done</Link>
          </div>
        </div>
        <ResumeReport report={report} />
        <Link href={`/resume/${session.code}`} className="btn-primary mt-6 block text-center">Open the full write-up →</Link>
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
          <p className="mt-2 text-sm text-slate2">This spoken interview uses your browser&apos;s built-in speech. Open it in Chrome or on desktop, or do the typed version instead.</p>
          <Link href="/start/refresh-resume" className="btn-primary mt-5 inline-block text-sm">Do the typed version</Link>
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
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-semibold">Talk Through Your Résumé</span>
        <button onClick={toggleMute} className="btn-ghost text-sm" title={muted ? "Unmute coach" : "Mute coach"}>{muted ? "🔇" : "🔊"}</button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {phase === "intro" ? (
          <div className="max-w-md">
            <div className={`voice-orb mx-auto ${orbState}`} />
            <h1 className="mt-8 text-2xl font-bold text-ink">A spoken interview about your year</h1>
            <p className="mt-2 text-slate2">A career coach talks with you out loud about what you&apos;ve accomplished. Just answer naturally and pause when you&apos;re done, it moves on by itself. No tapping needed. Works best in Chrome, or on desktop.</p>
            {voices.length > 1 && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm">
                <span className="text-slate-400">🔊 Voice</span>
                <select value={voiceName} onChange={(e) => chooseVoice(e.target.value)} className="max-w-[200px] bg-transparent font-medium text-ink focus:outline-none">
                  {englishVoices(voices).map((v) => (
                    <option key={v.name} value={v.name}>{TOP_TIER.test(v.name) ? "★ " : ""}{v.name.replace(/\s*\((Enhanced|Premium)\)/i, " $1").replace(/ - .*/, "")}</option>
                  ))}
                </select>
              </div>
            )}
            <div><button onClick={start} className="btn-primary mt-6 px-8 py-3 text-base">{messages.length ? "Resume the interview" : "Start the interview"} →</button></div>
            <p className="mt-3 text-xs text-slate-400">Voices marked ★ are the highest quality. Your mic is used only while you&apos;re answering.</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <button onClick={tapStatus} className={`voice-orb mx-auto ${orbState}`} aria-label="microphone" />
            <div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {phase === "speaking" ? "Coach speaking · tap to jump in" : phase === "listening" ? "Listening · just pause when you're done" : "Thinking…"}
            </div>
            {caption && <p className="mx-auto mt-4 max-w-xl text-xl leading-relaxed text-ink">{caption}</p>}
            {interim && <p className="mx-auto mt-3 max-w-xl text-lg italic text-slate-400">{interim}</p>}
            {err && <div className="mx-auto mt-4 max-w-sm rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          </div>
        )}
      </div>

      {phase !== "intro" && (
        <div className="flex flex-col items-center gap-2 px-6 pb-8">
          <button onClick={buildChanges} disabled={exchanges < 2} className="btn-dark px-6 py-2.5 text-sm disabled:opacity-40">
            {exchanges < 2 ? "Answer a couple of questions first" : "End & build my changes →"}
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
