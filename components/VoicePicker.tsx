"use client";

import { TOP_TIER, englishVoices } from "@/lib/voices";

// The intro-screen voice dropdown, best voices marked with a star. Shared.
export default function VoicePicker({ voices, voiceName, onChoose }: { voices: SpeechSynthesisVoice[]; voiceName: string; onChoose: (name: string) => void }) {
  if (voices.length <= 1) return null;
  return (
    <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm">
      <span className="text-slate-400">🔊 Voice</span>
      <select value={voiceName} onChange={(e) => onChoose(e.target.value)} className="max-w-[200px] bg-transparent font-medium text-ink focus:outline-none">
        {englishVoices(voices).map((v) => (
          <option key={v.name} value={v.name}>{TOP_TIER.test(v.name) ? "★ " : ""}{v.name.replace(/\s*\((Enhanced|Premium)\)/i, " $1").replace(/ - .*/, "")}</option>
        ))}
      </select>
    </div>
  );
}
