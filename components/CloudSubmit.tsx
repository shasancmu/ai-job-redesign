"use client";

import { useState } from "react";
import { MAX_PHRASE } from "@/lib/cloud";

// PUBLIC, no sign-in: submit one or more short phrases into the live cloud.
export default function CloudSubmit({ code, question }: { code: string; question: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mine, setMine] = useState<string[]>([]);

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
        setMine((m) => [phrase, ...m]);
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
          <button className="btn-primary" disabled={busy || !text.trim()}>
            {busy ? "Sending…" : mine.length > 0 ? "Add another" : "Add to cloud"}
          </button>
        </div>
      </form>

      {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {mine.length > 0 && (
        <div className="mt-5">
          <div className="text-sm font-medium text-sage">✓ Sent. Add as many as you like.</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mine.map((m, i) => (
              <span key={i} className="rounded-full bg-mist px-2.5 py-1 text-sm text-ink">{m}</span>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">Your words are on the screen. Waiting for the room…</p>
        </div>
      )}
    </div>
  );
}
