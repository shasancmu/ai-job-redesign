"use client";

import { PILLS, FEATURES, modulePills, moduleFeatures, type ModuleDef } from "@/lib/modules";

// Search + two pill rows (Topic / Format) shared by the dashboard catalog and
// the landing library. Controlled: the parent owns the state and does the
// filtering (via moduleMatches); this only renders the controls.
export default function ModuleFilters({
  query,
  onQuery,
  topics,
  onToggleTopic,
  features,
  onToggleFeature,
  onClear,
  modules,
  resultCount,
}: {
  query: string;
  onQuery: (v: string) => void;
  topics: Set<string>;
  onToggleTopic: (k: string) => void;
  features: Set<string>;
  onToggleFeature: (k: string) => void;
  onClear: () => void;
  modules: ModuleDef[]; // the pool to count against (so empty pills hide)
  resultCount?: number;
}) {
  const anyActive = !!(query.trim() || topics.size || features.size);

  const pill = (on: boolean) =>
    "rounded-full px-3 py-1 text-sm font-medium transition " +
    (on ? "bg-ink text-white" : "border border-line bg-white text-slate2 hover:border-slate-300");

  const topicCount = (k: string) => modules.filter((m) => modulePills(m.slug).includes(k as any)).length;
  const featureCount = (k: string) => modules.filter((m) => moduleFeatures(m.slug).includes(k as any)).length;

  return (
    <div data-tour="filters" className="space-y-3">
      {/* Search */}
      <div className="relative max-w-md">
        <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search exercises…"
          aria-label="Search exercises"
          className="field"
          style={{ paddingLeft: "2.25rem", paddingRight: "2.25rem" }}
        />
        {query && (
          <button onClick={() => onQuery("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink">✕</button>
        )}
      </div>

      {/* Topic pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Topic</span>
        {PILLS.map((p) => (topicCount(p.key) === 0 ? null : (
          <button key={p.key} onClick={() => onToggleTopic(p.key)} className={pill(topics.has(p.key))}>{p.label}</button>
        )))}
      </div>

      {/* Format pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Format</span>
        {FEATURES.map((f) => (featureCount(f.key) === 0 ? null : (
          <button key={f.key} onClick={() => onToggleFeature(f.key)} className={pill(features.has(f.key))}>{f.label}</button>
        )))}
      </div>

      {anyActive && (
        <div className="flex items-center gap-3 text-sm">
          <button onClick={onClear} className="text-slate-400 hover:text-ink">Clear all</button>
          {typeof resultCount === "number" && (
            <span className="text-slate-400">{resultCount} {resultCount === 1 ? "exercise" : "exercises"}</span>
          )}
        </div>
      )}
    </div>
  );
}
