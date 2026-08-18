"use client";

import type { PhotoEntry } from "@/lib/photo";

// The reveal: a masonry wall of the AI's readings of each photo (newest first).
// No images are shown or stored, only the text the model returned.
export default function PhotoWall({ entries }: { entries: PhotoEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-300">
        <span className="text-lg">Photos will appear here.</span>
      </div>
    );
  }
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
