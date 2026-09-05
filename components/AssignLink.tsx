"use client";

import { useState } from "react";

// Builds the shareable assignment link for a case. An optional class tag (?c=)
// lets the instructor see that class's engagement separately in insights.
export default function AssignLink({ slug }: { slug: string }) {
  const [cls, setCls] = useState("");
  const [copied, setCopied] = useState(false);
  const tag = cls.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/cases/${slug}${tag ? `?c=${tag}` : ""}`;

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="lbl">Assignment link</div>
      <p className="mt-0.5 text-xs text-slate-500">Share this with a class. Add a class name to track that cohort's engagement on its own.</p>
      <div className="mt-2 flex gap-2">
        <input className="field flex-1" value={cls} onChange={(e) => setCls(e.target.value)} placeholder="Class name (optional) e.g. MBA-Fall" />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-mist px-3 py-2 text-xs text-slate2">{link}</code>
        <button onClick={copy} className="btn-primary shrink-0 px-3 py-2 text-sm">{copied ? "Copied ✓" : "Copy"}</button>
      </div>
    </div>
  );
}
