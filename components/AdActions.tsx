"use client";

import { useState } from "react";

// The CTA and "I'm interested" on a spotlight landing page. Each fires its own
// tracked event, then the CTA opens the external destination.
export default function AdActions({ adId, ctaLabel, ctaUrl, cohort, signedIn }: {
  adId: string; ctaLabel: string | null; ctaUrl: string | null; cohort: string | null; signedIn: boolean;
}) {
  const [interested, setInterested] = useState(false);
  const [busy, setBusy] = useState(false);

  function log(kind: "cta" | "interest") {
    try {
      const payload = JSON.stringify({ adId, kind, cohort });
      // sendBeacon survives the navigation the CTA triggers.
      if (navigator.sendBeacon) navigator.sendBeacon("/api/ads/event", new Blob([payload], { type: "application/json" }));
      else fetch("/api/ads/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
    } catch { /* best effort */ }
  }

  async function markInterest() {
    if (interested || busy) return;
    setBusy(true);
    log("interest");
    setInterested(true);
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {ctaUrl && (
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => log("cta")}
          className="btn-primary text-sm"
        >
          {ctaLabel || "Learn more"} →
        </a>
      )}
      {signedIn && (
        interested ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-soft px-3 py-1.5 text-sm font-medium text-sage">✓ Noted — the team will follow up</span>
        ) : (
          <button onClick={markInterest} disabled={busy} className="btn-ghost text-sm">I&apos;m interested</button>
        )
      )}
    </div>
  );
}
