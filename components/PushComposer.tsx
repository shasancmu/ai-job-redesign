"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Seg = { key: string; label: string; hint: string; count: number };
const KINDS = [
  { key: "module", label: "Module drop", place: "e.g. /start/close-the-offer", cta: "Try it" },
  { key: "offer", label: "Exec-ed offer", place: "https://exec.fuqua.duke.edu/…", cta: "Learn more" },
  { key: "event", label: "Event", place: "https://… (registration link)", cta: "RSVP" },
  { key: "update", label: "Update", place: "Optional link", cta: "Read" },
];

// The director's push: a micro-dose of value (or a well-timed ask) to a segment.
export default function PushComposer({ segments }: { segments: Seg[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("module");
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [href, setHref] = useState("");
  const [cta, setCta] = useState("");
  const [segment, setSegment] = useState("everyone");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const kindMeta = KINDS.find((k) => k.key === kind)!;
  const seg = segments.find((s) => s.key === segment);

  async function send() {
    setErr(null); setMsg(null); setBusy(true);
    try {
      const res = await fetch("/api/team/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, body: bodyText, href, cta: cta || kindMeta.cta, segment }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Could not send."); setBusy(false); return; }
      setMsg(`Sent to ${data.count} ${data.count === 1 ? "person" : "people"}.`);
      setTitle(""); setBodyText(""); setHref(""); setCta("");
      setBusy(false);
      router.refresh();
    } catch { setErr("Could not send."); setBusy(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-dark w-full text-sm sm:w-auto">
        ✦ Send a push
      </button>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-ink/10 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-bold text-ink">Send a push</div>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-ink">✕</button>
      </div>

      {/* Kind */}
      <div className="mb-3 inline-flex flex-wrap gap-1 rounded-full border border-line bg-mist/50 p-0.5 text-xs">
        {KINDS.map((k) => (
          <button key={k.key} onClick={() => setKind(k.key)} className={"rounded-full px-3 py-1 font-medium transition " + (kind === k.key ? "bg-white text-ink shadow-soft" : "text-slate-400 hover:text-ink")}>{k.label}</button>
        ))}
      </div>

      <input className="field mb-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title — e.g. New: negotiate a scored deal against an AI" maxLength={160} />
      <textarea className="field mb-2 min-h-[64px]" value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder="A sentence of value or context (optional)." maxLength={1000} />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input className="field flex-1" value={href} onChange={(e) => setHref(e.target.value)} placeholder={kindMeta.place} />
        <input className="field w-full sm:w-40" value={cta} onChange={(e) => setCta(e.target.value)} placeholder={`Button: ${kindMeta.cta}`} maxLength={40} />
      </div>

      {/* Who */}
      <div className="mb-3">
        <label className="lbl">Send to</label>
        <select className="field" value={segment} onChange={(e) => setSegment(e.target.value)}>
          {segments.map((s) => <option key={s.key} value={s.key}>{s.label} ({s.count}) — {s.hint}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={send} disabled={busy || !title.trim() || !(seg && seg.count > 0)} className="btn-dark text-sm">
          {busy ? "Sending…" : `Send to ${seg?.count ?? 0}`}
        </button>
        {msg && <span className="text-sm font-medium text-sage">{msg}</span>}
        {err && <span className="text-sm text-clay">{err}</span>}
      </div>
      <p className="mt-2 text-xs text-slate-400">Give value first. A well-timed drop earns the occasional ask — it doesn&apos;t replace it.</p>
    </div>
  );
}
