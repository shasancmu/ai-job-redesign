"use client";

import type { SaveState as State } from "@/components/useDraftAutosave";

// A quiet, honest read on whether the author's work is safe. Sits beside Save
// so "did that stick?" never needs asking.
export default function SaveState({ state, savedAt }: { state: State; savedAt: Date | null }) {
  if (state === "clean" && !savedAt) return null;

  const label =
    state === "saving" ? "Saving…"
    : state === "dirty" ? "Unsaved changes"
    : state === "error" ? "Couldn't autosave — use Save"
    : savedAt ? `Saved ${timeAgo(savedAt)}`
    : "Saved";

  const tone =
    state === "error" ? "text-red-600"
    : state === "dirty" ? "text-amber-600"
    : "text-slate-400";

  return (
    <span className={"text-xs " + tone} aria-live="polite">
      {label}
    </span>
  );
}

function timeAgo(d: Date): string {
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}
