"use client";

import { useEffect, useState } from "react";

type Certificate = { id: string; name: string; viewUrl: string; linkedinUrl: string };
type Progress = { name: string; remaining: number; progressPct: number };

// The completion moment. Certificates are earned by BUNDLES, so a single
// finished exercise usually shows PROGRESS toward one; only when it completes a
// bundle does the celebratory certificate appear. Fails silent.
export default function CredentialMoment({ code }: { code: string }) {
  const [cert, setCert] = useState<Certificate | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/credential", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const d = await res.json();
        if (!alive) return;
        if (d?.certificate) setCert(d.certificate);
        else if (d?.progress) setProgress(d.progress);
      } catch {
        /* silent */
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  // Earned a certificate — celebrate + share.
  if (cert) {
    return (
      <div className="mb-5 overflow-hidden rounded-2xl border border-line bg-white no-print" data-guide="credential">
        <div className="h-1 w-full" style={{ background: "#3F7A52" }} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full" style={{ background: "#EAF2EC" }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M5 10.5l3.2 3.2L15 7" stroke="#3F7A52" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-[160px] flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#3F7A52" }}>Certificate earned</div>
            <div className="text-sm font-bold text-ink">{cert.name}</div>
            <div className="text-xs text-slate-400">You finished a full bundle.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={cert.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90" style={{ background: "#0A66C2" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
              </svg>
              Add to LinkedIn
            </a>
            <a href={cert.viewUrl} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist">View</a>
          </div>
        </div>
      </div>
    );
  }

  // Progress toward a certificate — a quiet nudge, no share.
  if (progress) {
    return (
      <div className="mb-5 rounded-2xl border border-line bg-mist/40 p-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-ink">{progress.remaining} more</span> toward the{" "}
            <span className="font-semibold text-ink">{progress.name}</span> certificate.
          </div>
          <a href="/achievements" className="text-xs font-semibold text-sage hover:underline">View achievements &rarr;</a>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full" style={{ background: "#3F7A52", width: `${progress.progressPct}%` }} />
        </div>
      </div>
    );
  }

  return null;
}
