"use client";

// Fire a module funnel event (drop-off) from a client runner. Best-effort;
// never throws, never blocks. keepalive so it lands even on tab close.
export function moduleBeacon(slug: string, kind: string, stage: "start" | "engage" | "complete"): void {
  if (!slug) return;
  try {
    fetch("/api/module-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, kind, stage }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* ignore */ }
}
