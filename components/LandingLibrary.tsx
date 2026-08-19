"use client";

import { useState } from "react";
import {
  MODULES,
  PARTNER_META,
  CATEGORIES,
  moduleCategory,
  PILLS,
  modulePills,
  pillLabel,
} from "@/lib/modules";
import ModuleIcon from "@/components/ModuleIcon";

// The marketing-page mirror of the dashboard catalog: same finite pill set,
// same category grouping — but cards are read-only (no start buttons) and the
// icon takes its category color so the palette matches the section header.
const VISIBLE = MODULES.filter((m) => !m.hidden);

export default function LandingLibrary() {
  const [activePills, setActivePills] = useState<Set<string>>(new Set());
  const togglePill = (k: string) =>
    setActivePills((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const grid = "mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3";

  const card = (m: (typeof MODULES)[number], chip: string) => (
    <div key={m.slug} className="card p-6 transition hover:shadow-lift">
      <div className={"flex h-11 w-11 items-center justify-center rounded-xl " + chip}>
        <ModuleIcon slug={m.slug} />
      </div>
      <h4 className="mt-4 text-lg font-bold text-ink">{m.name}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-slate2">{m.tagline}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {modulePills(m.slug).map((p) => (
          <button
            key={p}
            onClick={() => togglePill(p)}
            className={
              "rounded px-1.5 py-0.5 text-[10px] font-medium transition " +
              (activePills.has(p)
                ? "bg-ink text-white"
                : "bg-mist text-slate-500 hover:bg-slate-200")
            }
          >
            {pillLabel(p)}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink/45">
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium " +
            PARTNER_META[m.partner].chip
          }
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: PARTNER_META[m.partner].dot }} />
          {PARTNER_META[m.partner].label}
        </span>
        <span>{m.minutes} min</span>
      </div>
    </div>
  );

  return (
    <div className="mt-8">
      {/* Pill filter bar — the cross-cutting themes, shared with the dashboard. */}
      <div className="flex flex-wrap items-center gap-2">
        {PILLS.map((p) => {
          const on = activePills.has(p.key);
          const count = VISIBLE.filter((m) => modulePills(m.slug).includes(p.key)).length;
          if (count === 0) return null;
          return (
            <button
              key={p.key}
              onClick={() => togglePill(p.key)}
              className={
                "rounded-full px-3 py-1 text-sm font-medium transition " +
                (on ? "bg-ink text-white" : "border border-line bg-white text-slate2 hover:border-slate-300")
              }
            >
              {p.label}
            </button>
          );
        })}
        {activePills.size > 0 && (
          <button onClick={() => setActivePills(new Set())} className="text-sm text-slate-400 hover:text-ink">
            Clear
          </button>
        )}
      </div>

      {activePills.size > 0 ? (
        // Filtered flat grid — modules matching ANY selected pill.
        (() => {
          const mods = VISIBLE.filter((m) => modulePills(m.slug).some((p) => activePills.has(p)));
          return mods.length ? (
            <div className={grid}>{mods.map((m) => card(m, CATEGORIES.find((c) => c.key === moduleCategory(m.slug))?.chip || "bg-sage-soft text-sage"))}</div>
          ) : (
            <p className="mt-6 text-sm text-slate2">No exercises match those themes.</p>
          );
        })()
      ) : (
        <div className="space-y-12">
          {CATEGORIES.map((cat) => {
            const mods = VISIBLE.filter((m) => moduleCategory(m.slug) === cat.key);
            if (mods.length === 0) return null;
            return (
              <div key={cat.key}>
                <div className="flex items-baseline gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: cat.dot }} />
                  <h3 className="text-xl font-bold tracking-tight text-ink">{cat.title}</h3>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-slate2">{cat.blurb}</p>
                <div className={grid}>{mods.map((m) => card(m, cat.chip))}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
