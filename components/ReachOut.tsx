"use client";

import { useState } from "react";

// The memory-prosthetic reach-out. Opens a note the OS has DRAFTED from what this
// person last did — the human edits it and sends it in their own voice. Nothing
// leaves until they press Send; the draft is a starting point, never an outbox.
export default function ReachOut({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("A quick note");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function start() {
    setOpen(true); setSent(false); setErr("");
    if (text) return; // keep an in-progress edit
    await draft();
  }
  async function draft() {
    setLoading(true); setErr("");
    try {
      const d = await fetch("/api/team/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "draft", userId }) }).then((r) => r.json());
      if (d?.draft) setText(d.draft);
      else setErr(d?.error || "Couldn't draft — write your own below.");
    } catch { setErr("Couldn't draft — write your own below."); }
    setLoading(false);
  }
  async function send() {
    if (!text.trim()) { setErr("The note is empty."); return; }
    setBusy(true); setErr("");
    try {
      const d = await fetch("/api/team/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", userId, title: subject.trim() || "A quick note", body: text }) }).then((r) => r.json());
      if (d?.ok) { setSent(true); setTimeout(() => setOpen(false), 1200); }
      else setErr(d?.error || "Couldn't send.");
    } catch { setErr("Couldn't send."); }
    setBusy(false);
  }

  return (
    <>
      <button onClick={start} className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-sky transition hover:bg-sky-soft" title={`Write a note to ${name}`}>✎ Note</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-6" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-lift sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-ink">A note to {name}</div>
              <button onClick={() => !busy && setOpen(false)} className="text-slate-400 hover:text-ink">✕</button>
            </div>

            {sent ? (
              <div className="py-8 text-center">
                <div className="text-2xl">✓</div>
                <div className="mt-1 text-sm font-medium text-ink">Sent — from you, to {name}.</div>
              </div>
            ) : (
              <>
                <label className="lbl mt-3">Subject</label>
                <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} />
                <div className="mt-3 flex items-center justify-between">
                  <label className="lbl">Your note</label>
                  <button onClick={draft} disabled={loading || busy} className="text-xs font-medium text-sky hover:underline disabled:text-slate-300">{loading ? "drafting…" : "↻ redraft"}</button>
                </div>
                <textarea className="field min-h-[160px] leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} placeholder={loading ? "Drafting something to start from…" : "Write a few lines…"} />
                {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={send} disabled={busy || loading || !text.trim()} className="btn-primary text-sm">{busy ? "Sending…" : "Send"}</button>
                  <button onClick={() => setOpen(false)} disabled={busy} className="btn-ghost text-sm">Cancel</button>
                </div>
                <p className="mt-3 text-xs text-slate-400">This is a starting point, not an outbox. Edit it into your own words — it goes to {name}&apos;s inbox from you, and nothing sends until you press Send.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
