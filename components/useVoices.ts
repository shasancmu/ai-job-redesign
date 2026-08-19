import { useEffect, useRef, useState } from "react";
import { pickBestVoice } from "@/lib/voices";

// Loads the device's TTS voices (they populate asynchronously), settles on the
// best one or a saved preference, and lets the user switch (playing a sample).
// Shared by every voice-interview room so voice handling lives in one place.
export function useVoices(mutedRef: { current: boolean }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState<string>("");
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

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

  return { voices, voiceName, voiceRef, chooseVoice };
}
