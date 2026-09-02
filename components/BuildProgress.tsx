"use client";

// What an author sees while a module is being written. Deliberately reports
// only things that are true: the module's real name as soon as it appears in
// the stream, and the number of words actually drafted so far.
//
// This replaces a rotating list of invented phases ("Building a rubric that
// grades the thinking…") that advanced on a timer regardless of what the model
// was doing — and which, when the request then failed, had been describing work
// that never happened.
export default function BuildProgress({
  chars,
  name,
  fallbackLabel,
}: {
  chars: number;
  name?: string;
  fallbackLabel: string;
}) {
  // ~5.5 chars a word is close enough, and a word count is easier to read than
  // a character count. A typical draft lands around 3,000 words, so that's the
  // denominator for the bar — capped, since it's an estimate, not a promise.
  const words = Math.round(chars / 5.5);
  const pct = Math.min(96, Math.round((words / 3000) * 100));

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3">
        <span
          className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-ai"
          aria-hidden
        />
        <div className="min-w-0">
          <div className="truncate font-serif text-xl text-ink">
            {name ? <>Writing “{name}”</> : "Writing your module"}
          </div>
          <div className="truncate text-sm text-slate2">{fallbackLabel}</div>
        </div>
      </div>

      <div
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Drafting your module"
      >
        <div className="h-full bg-ai transition-all duration-500" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>{words > 0 ? `${words.toLocaleString()} words drafted` : "Starting…"}</span>
        <span>Writing it live, so this can take a minute or two.</span>
      </div>
    </div>
  );
}
