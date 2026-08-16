"use client";

import { useState } from "react";

export default function NetworkRosterEditor({
  cohort,
  initialNames,
}: {
  cohort: string;
  initialNames: string[];
}) {
  const [text, setText] = useState(initialNames.join("\n"));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const count = text.split("\n").map((s) => s.trim()).filter(Boolean).length;

  async function save() {
    setBusy(true);
    setMsg(null);
    const names = text.split("\n").map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/network/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cohort, names }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? `Saved ${data.count} names.` : data.error || "Save failed.");
  }

  return (
    <div>
      <textarea
        className="field min-h-[320px] font-mono text-sm"
        placeholder={"First Last\nFirst Last\n…"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-1 text-sm text-slate2">{count} names</div>
      <div className="mt-3 rounded-lg bg-amber-soft px-3 py-2 text-xs text-ink">
        Saving replaces the current roster — set it before people start the survey.
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? "Saving…" : "Save roster"}
        </button>
        {msg && <span className="text-sm text-slate2">{msg}</span>}
      </div>
    </div>
  );
}
