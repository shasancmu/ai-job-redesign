"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";

type Item = { id: string; title: string; presenter?: string };
type State = { title: string; items: Item[]; current: number; status: string };

export default function ShowcaseParticipant({ code }: { code: string }) {
  const [state, setState] = useState<State | null>(null);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sentFor, setSentFor] = useState<string>("");
  const lastItem = useRef<string>("");

  useEffect(() => { try { setName(localStorage.getItem("showcase-name") || ""); } catch {} }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/showcase/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await res.json().catch(() => ({}));
      if (!d.error) setState(d);
    } catch {}
  }, [code]);

  useEffect(() => { poll(); const id = setInterval(poll, 3000); return () => clearInterval(id); }, [poll]);

  const item = state && state.current >= 0 ? state.items[state.current] : null;

  // Reset the form when the presenter moves to a new item.
  useEffect(() => {
    const id = item?.id || "";
    if (id !== lastItem.current) { lastItem.current = id; setText(""); setRating(0); setSentFor(""); }
  }, [item?.id]);

  async function send() {
    if (!item || !text.trim()) return;
    setBusy(true);
    try {
      if (name.trim()) localStorage.setItem("showcase-name", name.trim());
      const res = await fetch("/api/showcase/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, itemId: item.id, name: name.trim(), text: text.trim(), rating: rating || undefined }) });
      if (res.ok) { setText(""); setRating(0); setSentFor(item.id); }
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 py-6">
      <div className="mb-4 flex justify-center"><Logo /></div>

      {!state ? (
        <div className="card p-7 text-center text-slate-400">Loading...</div>
      ) : state.status === "closed" ? (
        <div className="card p-7 text-center">
          <div className="mb-2 text-2xl">🎤</div>
          <h1 className="text-xl font-bold text-ink">This showcase has ended</h1>
          <p className="mt-2 text-sm text-slate2">Thanks for the feedback.</p>
        </div>
      ) : !item ? (
        <div className="card p-7 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{state.title || "Showcase"}</div>
          <h1 className="mt-2 text-xl font-bold text-ink">Waiting to start</h1>
          <p className="mt-2 text-sm text-slate2">Feedback opens when the first presenter begins. Hang tight.</p>
          {name === "" && (
            <div className="mt-4 text-left">
              <label className="lbl">Your name (optional)</label>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-mist p-4 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Now presenting · {state.current + 1} of {state.items.length}</div>
            <h1 className="mt-1 text-xl font-bold leading-snug text-ink">{item.title}</h1>
            {item.presenter && <div className="mt-0.5 text-sm text-slate-500">{item.presenter}</div>}
          </div>

          <div className="card p-5">
            <label className="lbl">Your name (optional)</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />

            <label className="lbl mt-3">Rating (optional)</label>
            <div className="mt-1 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n === rating ? 0 : n)} className={"h-9 w-9 rounded-lg text-lg " + (n <= rating ? "bg-amber text-white" : "bg-mist text-slate-300 hover:text-amber")} aria-label={`${n} stars`}>★</button>
              ))}
            </div>

            <label className="lbl mt-3">Your feedback</label>
            <textarea className="field" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="What worked? What would make it stronger?" />
            <button onClick={send} disabled={busy || !text.trim()} className="btn-primary mt-3 w-full disabled:opacity-50">{busy ? "Sending..." : "Send feedback"}</button>
            {sentFor === item.id && <p className="mt-2 text-center text-sm text-sage">Sent ✓ Add more any time while they present.</p>}
          </div>
        </div>
      )}
    </main>
  );
}
