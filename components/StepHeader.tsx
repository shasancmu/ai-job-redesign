"use client";

import { useT } from "./I18nProvider";

// The step counter and title every room shows above its content.
//
// This existed in nineteen rooms as a copy-pasted pair of divs, and the copies
// had drifted into four dialects: two of them localised through t(), the rest
// printing "Step 1 of 4" as a hard-coded English literal even though the app
// ships nine locales. Some appended a per-step budget, some didn't. Owning it
// here means a room can't drift again, and the untranslated ones get a
// localised header without having to touch their imports.
export default function StepHeader({
  n,
  total,
  minutes,
  title,
  subtitle,
  note,
}: {
  n: number; // 1-based
  total: number;
  minutes?: number | null; // omitted when the step has no budget of its own
  title: string;
  subtitle?: string | null;
  note?: string | null; // a room-specific aside on the counter line
}) {
  const t = useT();
  return (
    <div className="mb-5">
      <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        {t("room.step", { n, total })}
        {minutes ? ` · ${t("catalog.min", { n: minutes })}` : ""}
        {note ? ` · ${note}` : ""}
      </div>
      <h1 className="mt-1 text-2xl font-bold text-ink">{title}</h1>
      {subtitle && <p className="mt-1 max-w-3xl text-slate-500">{subtitle}</p>}
    </div>
  );
}
