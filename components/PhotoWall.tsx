"use client";

import type { PhotoEntry } from "@/lib/photo";

// The reveal. Read-only Photo Wall (showPhotos=false): a masonry of the AI's
// text readings, no images. Photo Gallery (showPhotos=true): the actual scaled
// thumbnails, each with the participant's caption or the AI's read.
export default function PhotoWall({ entries, showPhotos = false }: { entries: PhotoEntry[]; showPhotos?: boolean }) {
  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-300">
        <span className="text-lg">Photos will appear here.</span>
      </div>
    );
  }
  // Gallery: a tight collage of small thumbnails with short AI captions.
  if (showPhotos) {
    return (
      <div className="h-full overflow-y-auto px-2 pb-4">
        <div className="mx-auto max-w-6xl columns-2 gap-2 sm:columns-3 md:columns-4 lg:columns-5">
          {entries.map((e, i) => {
            const cap = (e.caption || "").trim() || (e.kind === "text" ? e.transcript : e.description) || "";
            return (
              <figure
                key={e.id}
                className="cloud-card mb-2 break-inside-avoid overflow-hidden rounded-lg border border-line bg-white shadow-soft"
                style={{ animationDelay: `${Math.min(i * 35, 700)}ms` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.image && <img src={e.image} alt={cap || "Photo"} className="w-full object-cover" loading="lazy" />}
                {cap && <figcaption className="line-clamp-3 px-2 py-1.5 text-[11px] leading-snug text-slate-600">{cap}</figcaption>}
              </figure>
            );
          })}
        </div>
      </div>
    );
  }

  // Read-only wall: masonry of the AI's text readings, no images.
  return (
    <div className="h-full overflow-y-auto px-2 pb-4">
      <div className="mx-auto max-w-6xl columns-1 gap-4 sm:columns-2 lg:columns-3">
        {entries.map((e, i) => {
          const body = e.kind === "text" && e.transcript ? e.transcript : e.description;
          return (
            <div
              key={e.id}
              className="cloud-card mb-4 break-inside-avoid rounded-2xl border border-line bg-white p-5 shadow-soft"
              style={{ animationDelay: `${Math.min(i * 45, 900)}ms` }}
            >
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {e.kind === "text" ? "✎ note" : "◈ photo"}
              </div>
              <div className="font-bold text-ink">{e.title || (e.kind === "text" ? "Note" : "Photo")}</div>
              <p className="mt-1.5 line-clamp-[8] whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
