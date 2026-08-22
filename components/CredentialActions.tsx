"use client";

import { useState } from "react";

// Actions on a public credential: the LinkedIn "Add to profile" deep link (the
// growth loop) and a copy-link fallback for posting anywhere.
export default function CredentialActions({
  linkedinUrl,
  shareUrl,
  skills = [],
}: {
  linkedinUrl: string;
  shareUrl: string;
  skills?: string[];
}) {
  const [copied, setCopied] = useState<null | "link" | "skills">(null);

  async function copy(what: "link" | "skills", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: "#0A66C2" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
          </svg>
          Add to LinkedIn
        </a>
        <button
          onClick={() => copy("link", shareUrl)}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-mist"
        >
          {copied === "link" ? "Copied" : "Copy link"}
        </button>
      </div>

      {skills.length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-mist/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-ink">Skills this demonstrates</div>
            <button
              onClick={() => copy("skills", skills.join(", "))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-mist"
            >
              {copied === "skills" ? "Copied" : "Copy skills"}
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                {s}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            LinkedIn fills the certification automatically. It can&apos;t add skills for you, so copy
            these into your profile&apos;s Skills section.
          </p>
        </div>
      )}
    </div>
  );
}
