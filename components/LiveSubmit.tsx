"use client";

import { useEffect, useState } from "react";

// Anonymous participant view. One submission per browser (localStorage gate).
export default function LiveSubmit({ spec, code }: { spec: any; code: string }) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const key = `live:submitted:${code}`;

  useEffect(() => { try { if (localStorage.getItem(key)) setDone(true); } catch {} }, [key]);

  async function submit(choice?: string) {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/live/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, text: choice ? "" : text, choice: choice || "" }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(d.error || "Couldn't submit.");
      try { localStorage.setItem(key, "1"); } catch {}
      setDone(true);
    } catch (e: any) { setErr(e?.message || "Couldn't submit."); }
    finally { setBusy(false); }
  }

  if (done) return (
    <div className="mx-auto max-w-md text-center">
      <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
        <div className="text-3xl">✓</div>
        <div className="mt-2 font-serif text-xl text-ink">Thanks — it's in.</div>
        <p className="mt-1 text-sm text-slate-500">Watch the screen.</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="text-3xl">{spec.emoji || "🌥️"}</div>
        <h1 className="mt-2 font-serif text-2xl text-ink">{spec.prompt}</h1>
        {spec.kind === "poll" ? (
          <div className="mt-4 space-y-2">
            {(spec.options || []).map((o: string, i: number) => (
              <button key={i} onClick={() => submit(o)} disabled={busy} className="w-full rounded-xl border border-line p-3 text-left text-sm font-medium text-ink hover:border-sage hover:bg-sage-soft disabled:opacity-50">{o}</button>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <textarea className="field text-base" rows={spec.kind === "wordcloud" ? 2 : 5} value={text} onChange={(e) => setText(e.target.value)} placeholder={spec.kind === "wordcloud" ? "A word or short phrase" : "Your response"} autoFocus />
            <button onClick={() => submit()} disabled={busy || !text.trim()} className="btn-primary mt-3 w-full disabled:opacity-50">{busy ? "Sending…" : "Send"}</button>
          </div>
        )}
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      </div>
    </div>
  );
}
