"use client";

import { useEffect } from "react";

export type PromoSlim = { id: string; slug: string; emoji: string | null; title: string; tagline: string | null };

// The member-facing spotlight cards. They look like module cards but link to a
// spotlight's landing page; each fires an impression when shown (the landing
// page logs the click-through on open).
export default function PromoCards({ ads, cohort, orgName }: { ads: PromoSlim[]; cohort?: string | null; orgName?: string | null }) {
  useEffect(() => {
    for (const ad of ads) {
      try {
        const payload = JSON.stringify({ adId: ad.id, kind: "impression", cohort: cohort || null });
        if (navigator.sendBeacon) navigator.sendBeacon("/api/ads/event", new Blob([payload], { type: "application/json" }));
        else fetch("/api/ads/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
      } catch { /* best effort */ }
    }
    // Fire once per mount for the set shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ads.length) return null;
  const href = (slug: string) => `/promo/${slug}${cohort ? `?c=${encodeURIComponent(cohort)}` : ""}`;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="h-2 w-2 rounded-full bg-ai" />
        <h3 className="text-sm font-bold text-ink">{orgName ? `From ${orgName}` : "From your program"}</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ads.map((ad) => (
          <a key={ad.id} href={href(ad.slug)} className="card group flex flex-col p-5 transition hover:shadow-lift">
            <div className="flex items-start justify-between">
              <div className="text-2xl" aria-hidden>{ad.emoji || "📣"}</div>
              <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Program</span>
            </div>
            <h3 className="mt-3 text-base font-bold leading-snug text-ink group-hover:text-ai">{ad.title}</h3>
            {ad.tagline && <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500">{ad.tagline}</p>}
            <span className="mt-4 text-sm font-semibold text-ai">Learn more →</span>
          </a>
        ))}
      </div>
    </section>
  );
}
