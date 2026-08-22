"use client";

import { useState } from "react";
import Link from "next/link";
import type { QuickTake as Take } from "@/lib/ai";

type Step = "ask" | "predict" | "loading" | "reveal";

const SHARES = ["A little", "About a third", "More than half", "Almost all of it"];

// The 90-second onboarding "first level": one real question, a prediction, and
// an uncannily specific reveal, all before asking anyone to sign up. The reveal
// is the reason to sign up.
export default function QuickTake() {
  const [step, setStep] = useState<Step>("ask");
  const [role, setRole] = useState("");
  const [share, setShare] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [take, setTake] = useState<Take | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(chosen: string) {
    setShare(chosen);
    setStep("loading");
    setErr(null);
    try {
      const res = await fetch("/api/quick-take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, share: chosen, website }),
      });
      const d = await res.json();
      if (res.ok && d.take?.headline) { setTake(d.take); setStep("reveal"); }
      else { setErr(d.error || "Couldn't read that. Try again."); setStep("predict"); }
    } catch { setErr("Connection hiccup. Try again."); setStep("predict"); }
  }

  // ---- Reveal ----
  if (step === "reveal" && take) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="text-xs font-semibold uppercase tracking-wide text-sage">Your 90-second read</div>
        <h1 className="mt-2 text-2xl font-bold leading-snug text-ink sm:text-3xl">{take.headline}</h1>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-4" style={{ borderTop: "3px solid #CE8F2C" }}>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#B07A1E" }}>AI can already do this</div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{take.aiPart}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-4" style={{ borderTop: "3px solid #3F7A52" }}>
            <div className="text-xs font-semibold uppercase tracking-wide text-sage">Still only you</div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{take.yourEdge}</p>
          </div>
        </div>

        {take.nudge && (
          <div className="mt-4 rounded-xl bg-mist p-3 text-sm text-slate-600">
            <span className="font-medium text-ink">You guessed &ldquo;{share}.&rdquo;</span> {take.nudge}
          </div>
        )}

        <div className="mt-7">
          <Link href="/start/solo-ai" className="btn-primary w-full text-center sm:w-auto">Redesign your job around this &rarr;</Link>
          <p className="mt-2 text-xs text-slate-400">That was the surface. The full exercise goes far deeper, about 15 minutes, and it&apos;s free to start.</p>
        </div>
        <button onClick={() => { setStep("ask"); setTake(null); setRole(""); setShare(""); }} className="mt-4 text-sm text-slate-400 hover:text-ink">Try a different answer</button>
      </div>
    );
  }

  // ---- Loading ----
  if (step === "loading") {
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-line border-t-sage" />
        <p className="mt-4 text-slate-500">Reading what you said&hellip;</p>
      </div>
    );
  }

  // ---- Ask + Predict ----
  return (
    <div className="mx-auto max-w-xl">
      {/* honeypot */}
      <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="absolute left-[-9999px]" aria-hidden />

      {step === "ask" ? (
        <>
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">90 seconds, no account needed</div>
          <h1 className="mt-2 text-2xl font-bold leading-snug text-ink sm:text-3xl">In one sentence, what do you actually do all day?</h1>
          <p className="mt-2 text-slate-500">Be specific about the real work, not your title. This stays private.</p>
          <textarea
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && role.trim().length > 2) setStep("predict"); }}
            rows={3}
            autoFocus
            placeholder="e.g. I manage a team of 5, review their work, handle client escalations, and put together the weekly numbers for my boss."
            className="field mt-4 w-full resize-none"
          />
          <button onClick={() => setStep("predict")} disabled={role.trim().length < 3} className="btn-primary mt-4 disabled:opacity-40">Next &rarr;</button>
        </>
      ) : (
        <>
          <button onClick={() => setStep("ask")} className="mb-3 text-sm text-slate-400 hover:text-ink">&larr; Back</button>
          <div className="text-xs font-semibold uppercase tracking-wide text-sage">Before you see it, take a guess</div>
          <h1 className="mt-2 text-2xl font-bold leading-snug text-ink sm:text-3xl">How much of that could AI already do today?</h1>
          <p className="mt-2 text-slate-500">Most people are wrong about this. That&apos;s the point.</p>
          {err && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {SHARES.map((s) => (
              <button key={s} onClick={() => run(s)} className="rounded-xl border-2 border-slate-200 p-3.5 text-left text-sm font-medium transition hover:border-ink hover:bg-slate-50">
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
