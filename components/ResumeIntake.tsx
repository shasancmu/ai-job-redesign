"use client";

import { useState } from "react";
import type { ResumeSource } from "@/lib/resume";

// Step one of both résumé modules: get the baseline. If we already have a résumé
// on file (from a prior Career X-ray or an earlier run), it's prefilled and they
// can just continue.
export default function ResumeIntake({
  prefill,
  prefillFrom,
  onStart,
  cta = "Start the interview",
}: {
  prefill?: string;
  prefillFrom?: string;
  onStart: (s: ResumeSource) => void;
  cta?: string;
}) {
  const [kind, setKind] = useState<"resume" | "linkedin">("resume");
  const [text, setText] = useState(prefill || "");
  const ready = text.trim().length >= 80;
  const hasPrefill = !!prefill && text === prefill;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">Let&apos;s refresh your résumé</h1>
      <p className="mt-2 text-slate2">
        Start with what you have. Paste your current résumé, or your LinkedIn profile text. Then an AI coach interviews you about what you&apos;ve accomplished in the last year, and hands back the exact changes to make.
      </p>

      {hasPrefill && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-sage-soft/50 px-4 py-3 text-sm text-slate-700">
          <span>✓</span>
          <span>We already have your résumé{prefillFrom ? ` from ${prefillFrom}` : ""}. Use it as-is, edit it below, or paste a newer version.</span>
        </div>
      )}

      <div className="mt-5 inline-flex rounded-full bg-mist p-1 text-sm">
        <button onClick={() => setKind("resume")} className={"rounded-full px-3 py-1 " + (kind === "resume" ? "bg-white font-semibold text-ink shadow-sm" : "text-slate-500")}>Résumé</button>
        <button onClick={() => setKind("linkedin")} className={"rounded-full px-3 py-1 " + (kind === "linkedin" ? "bg-white font-semibold text-ink shadow-sm" : "text-slate-500")}>LinkedIn profile</button>
      </div>

      <textarea
        className="field mt-3 min-h-[280px] font-mono text-xs"
        placeholder={kind === "linkedin"
          ? "Paste your LinkedIn profile here. Open your profile, select all the text (headline, About, each experience), and paste it in."
          : "Paste your résumé here, plain text is fine."}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => onStart({ kind, text: text.trim() })} disabled={!ready} className="btn-primary px-6 py-2.5 disabled:opacity-40">
          {cta} →
        </button>
        {!ready && <span className="text-xs text-slate-400">Paste your {kind === "linkedin" ? "profile" : "résumé"} to begin.</span>}
      </div>
    </div>
  );
}
