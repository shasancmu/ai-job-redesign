"use client";

import { useState } from "react";
import { reviewStepsFor } from "@/lib/draftReview";
import { AUTHOR_FORMATS } from "@/lib/authorFormats";
import { streamSpec } from "@/lib/specStreamClient";

// The hand-off, as a conversation instead of a wall.
//
// The AI has just written thousands of words. Dropping an author straight into
// a twelve-tab editor asks them to audit all of it with no sense of what
// matters. This walks the few decisions that actually determine the module,
// biggest first: what was chosen, why it leads, and three ways to respond.
//
// "Keep it" is the default and the fast path — an author who likes the draft
// presses through in under a minute. The editor is one click away throughout,
// for anyone who would rather just go read the fields themselves.
export default function DraftReview({
  formatId,
  spec,
  onChange,
  onDone,
}: {
  formatId: string;
  spec: any;
  onChange: (spec: any) => void;
  onDone: () => void;
}) {
  const steps = reviewStepsFor(formatId, spec);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState("");

  // Nothing worth reviewing (an unusual spec) — don't stand in the way.
  if (!steps.length) { onDone(); return null; }

  const step = steps[Math.min(i, steps.length - 1)];
  const endpoint = AUTHOR_FORMATS.find((f) => f.id === formatId)?.endpoint;
  const last = i >= steps.length - 1;

  function next() {
    setEditing(null); setErr("");
    if (last) onDone(); else setI(i + 1);
  }

  async function reroll() {
    if (!endpoint) return;
    setBusy(true); setErr(""); setProgress(0);
    try {
      const revised = await streamSpec(
        endpoint,
        { intent: step.reroll, currentSpec: spec },
        (p) => setProgress(p.chars)
      );
      onChange(revised);
    } catch (e: any) {
      setErr(e?.message || "Couldn't revise that. Try again, or edit it yourself.");
    } finally {
      setBusy(false);
    }
  }

  function saveOwn(text: string) {
    if (!step.write) return;
    onChange(step.write(spec, text));
    setEditing(null);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Reviewing your draft · {i + 1} of {steps.length}</span>
        <button onClick={onDone} className="hover:text-ink">Skip to the editor →</button>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {steps.map((s, n) => (
          <span key={s.key} className={"h-1 flex-1 rounded-full " + (n <= i ? "bg-ai" : "bg-slate-200")} />
        ))}
      </div>

      <h2 className="mt-6 font-serif text-2xl text-ink">{step.title}</h2>
      <p className="mt-1 text-sm text-slate2">{step.why}</p>

      <div className="card mt-5 p-5">
        {busy ? (
          <div className="flex items-center gap-3 text-sm text-slate2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-ai" aria-hidden />
            Rewriting it — {Math.round(progress / 5.5).toLocaleString()} words so far
          </div>
        ) : editing !== null ? (
          <div>
            <textarea
              className="field w-full text-sm"
              style={{ minHeight: "9rem" }}
              value={editing}
              onChange={(e) => setEditing(e.target.value)}
              autoFocus
            />
            <div className="mt-3 flex gap-2">
              <button onClick={() => saveOwn(editing)} className="btn-primary text-sm">Use this</button>
              <button onClick={() => setEditing(null)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{step.read(spec)}</p>
        )}
      </div>

      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}

      {!busy && editing === null && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button onClick={next} className="btn-primary">
            {last ? "Keep it, open the editor →" : "Keep it →"}
          </button>
          <button onClick={reroll} className="btn-ghost text-sm">Try a different one</button>
          {step.write && (
            <button onClick={() => setEditing(step.read(spec))} className="btn-ghost text-sm">
              Write my own
            </button>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Saved as a draft already. Everything here is editable later — this is just the part worth a look first.
      </p>
    </div>
  );
}
