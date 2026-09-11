"use client";

import { useState } from "react";
import { MODULES, CATEGORIES, moduleCategory } from "@/lib/modules";

export type PickItem = { slug: string; name: string };

const REGISTRY = new Set(MODULES.map((m) => m.slug));
const CUSTOM_GROUP = "Custom & authored";

// One consistent module picker used at every level (org / class / cohort). The
// caller passes the ALREADY-SCOPED list of modules (org = master list, class =
// subset, cohort = subset of its class), so this component only handles the UI:
// search + category grouping with a per-group select-all. Keeps the three levels
// visually identical.
export default function ModulePicker({
  available,
  selected,
  onToggle,
  onSetMany,
  height = "max-h-72",
  emptyNote = "No modules available here.",
}: {
  available: PickItem[];
  selected: Set<string>;
  onToggle: (slug: string) => void;
  onSetMany: (slugs: string[], on: boolean) => void;
  height?: string;
  emptyNote?: string;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = available.filter((m) => !query || m.name.toLowerCase().includes(query));

  const groupTitle = (slug: string) =>
    REGISTRY.has(slug) ? (CATEGORIES.find((c) => c.key === moduleCategory(slug))?.title || "Other") : CUSTOM_GROUP;

  const byGroup = new Map<string, PickItem[]>();
  for (const m of filtered) {
    const t = groupTitle(m.slug);
    if (!byGroup.has(t)) byGroup.set(t, []);
    byGroup.get(t)!.push(m);
  }
  const order = [...CATEGORIES.map((c) => c.title), CUSTOM_GROUP];
  const groups = order.filter((t) => byGroup.has(t)).map((t) => ({ title: t, mods: byGroup.get(t)! }));

  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search modules…" className="field mb-1.5 text-sm" />
      <div className={"space-y-3 overflow-y-auto rounded-lg border border-line p-2 " + height}>
        {available.length === 0 ? (
          <div className="px-1 py-4 text-center text-xs text-slate-400">{emptyNote}</div>
        ) : groups.length === 0 ? (
          <div className="px-1 py-4 text-center text-xs text-slate-400">No modules match &ldquo;{q}&rdquo;.</div>
        ) : groups.map((g) => {
          const slugs = g.mods.map((m) => m.slug);
          const selCount = slugs.filter((s) => selected.has(s)).length;
          const allSel = selCount === slugs.length;
          return (
            <div key={g.title}>
              <div className="mb-1 flex items-center justify-between px-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.title} <span className="text-slate-300">{selCount}/{slugs.length}</span></span>
                <button type="button" onClick={() => onSetMany(slugs, !allSel)} className="text-[11px] text-sky hover:underline">{allSel ? "Clear" : "All"}</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.mods.map((m) => (
                  <button key={m.slug} type="button" onClick={() => onToggle(m.slug)} className={"rounded-full px-2.5 py-1 text-xs font-medium transition " + (selected.has(m.slug) ? "bg-ink text-white" : "bg-mist text-slate2 hover:bg-slate-200")}>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
