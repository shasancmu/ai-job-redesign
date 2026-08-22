"use client";

import { useEffect, useState } from "react";

type Cred = { id: string; title?: string; name?: string; viewUrl: string; linkedinUrl: string };

// The completion moment: once a report is done, quietly confirm the credential
// the user just earned and offer the one-click LinkedIn add + verify link.
// Fails silent — if anything is missing (e.g. table not migrated), it renders
// nothing and the report is unaffected.
export default function CredentialMoment({ code }: { code: string }) {
  const [credential, setCredential] = useState<Cred | null>(null);
  const [track, setTrack] = useState<Cred | null>(null);

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
        if (d?.credential) setCredential(d.credential);
        if (d?.track) setTrack(d.track);
      } catch {
        /* silent */
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  if (!credential) return null;

  // A finished track is the bigger deal — lead with it.
  const lead = track || credential;
  const isTrack = !!track;
  const label = isTrack ? (lead.name as string) : (lead.title as string);

  const linkedin =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90";
  const ghost =
    "inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist";

  return (
    <div
      className="mb-5 overflow-hidden rounded-2xl border border-line bg-white no-print"
      data-guide="credential"
    >
      <div className="h-1 w-full" style={{ background: "#3F7A52" }} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
          style={{ background: "#EAF2EC" }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M5 10.5l3.2 3.2L15 7"
              stroke="#3F7A52"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="min-w-[160px] flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#3F7A52" }}>
            {isTrack ? "Certificate earned" : "Credential earned"}
          </div>
          <div className="text-sm font-bold text-ink">{label}</div>
          {isTrack && (
            <div className="text-xs text-slate-400">You finished a full track. That is a certificate.</div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className={linkedin} style={{ background: "#0A66C2" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
            </svg>
            Add to LinkedIn
          </a>
          <a href={lead.viewUrl} className={ghost}>
            View
          </a>
          <a href="/achievements" className="text-xs font-medium text-slate-400 hover:text-ink">
            All achievements
          </a>
        </div>
      </div>
    </div>
  );
}
