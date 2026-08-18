"use client";

import { useEffect, useState } from "react";
import { MAX_PHRASE } from "@/lib/cloud";

// PUBLIC, no sign-in: submit ONE phrase per device. The gate is client-side
// (anonymous participants have no identity), keyed to this browser by code.
export default function CloudSubmit({ code, question }: { code: string; question: string }) {
  const key = `cloud:submitted:${code}`;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Read the prior submission after mount (avoids an SSR/hydration mismatch).
  useEffect(() => {
    try {
      setSubmitted(localStorage.getItem(key));
    } catch {
      /* private mode / storage blocked: treat as not submitted */
    }
    setReady(true);
  }, [key]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const phrase = text.trim();
    if (!phrase || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/cloud/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, text: phrase }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Couldn't send. Try again.");
      } else {
        try {
          localStorage.setItem(key, phrase);
        } catch {
          /* ignore */
        }
        setSubmitted(phrase);
        setText("");
      }
    } catch {
      setErr("Couldn't send. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-7">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The question</div>
      <h1 className="mt-1 text-xl font-bold leading-snug text-ink">{question || "Add a word to the cloud"}</h1>

      {ready && submitted ? (
        <div className="mt-6 text-center">
          <div className="text-3xl">✓</div>
          <div className="mt-2 font-semibold text-ink">You're in.</div>
          <div className="mt-1 text-sm text-slate2">You added</div>
          <div className="mt-2 inline-block rounded-full bg-sage-soft px-4 py-1.5 text-sm font-medium text-sage">
            {submitted}
          </div>
          <p className="mt-4 text-xs text-slate-400">Your word is on the screen. Watch the cloud build.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="A word or short phrase"
            maxLength={MAX_PHRASE}
            autoComplete="off"
            className="field text-lg"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{text.length}/{MAX_PHRASE}</span>
            <button className="btn-primary" disabled={busy || !text.trim() || !ready}>
              {busy ? "Sending…" : "Add to cloud"}
            </button>
          </div>
          <p className="text-xs text-slate-400">One entry per person.</p>
        </form>
      )}

      {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
    </div>
  );
}
