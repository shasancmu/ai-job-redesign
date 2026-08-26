"use client";

import { useState } from "react";

// Prominent, auto-ready share for a reimagined-role plan. The public link already
// exists (minted when the plan was built), so this just copies it, no enable step.
export default function ShareGift({ path, recipientName }: { path: string; recipientName?: string | null }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    try {
      const url = `${window.location.origin}${path}`;
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }
  const who = recipientName || "your partner";
  return (
    <div className="card overflow-hidden p-0">
      <div className="h-1.5" style={{ background: "linear-gradient(90deg, #3F7A52, #CE8F2C)" }} />
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold text-ink">
            <span aria-hidden>🎁</span>
            {recipientName ? `Share this report with ${who}` : "Share this report"}
          </div>
          {recipientName ? (
            <p className="mt-1 text-sm text-slate2">
              {who} already has it in their reports, no link needed. Want to send it directly? Copy a public link
              anyone can open.
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate2">Copy a public link anyone can open, no account needed.</p>
          )}
        </div>
        <button onClick={copy} className="btn-primary shrink-0">
          {copied ? "Link copied ✓" : "Copy share link"}
        </button>
      </div>
    </div>
  );
}
