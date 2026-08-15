"use client";

import { useState } from "react";
import { AI_CELLS, HUMAN_CELLS, emptyGrid, Cell } from "@/lib/exercise";

// Self-contained 2×4 editor. Controlled by `grid` + `onChange`.
export default function GridEditor({
  grid,
  onChange,
}: {
  grid: Record<string, string[]>;
  onChange: (grid: Record<string, string[]>) => void;
}) {
  const g = { ...emptyGrid(), ...(grid || {}) };
  const setCell = (key: string, items: string[]) => onChange({ ...g, [key]: items });
  const toggle = (key: string, verb: string) => {
    const cur = g[key] || [];
    setCell(key, cur.includes(verb) ? cur.filter((v) => v !== verb) : [...cur, verb]);
  };
  const remove = (key: string, verb: string) => setCell(key, (g[key] || []).filter((v) => v !== verb));
  const addCustom = (key: string, verb: string) => {
    const v = verb.trim();
    if (!v) return;
    const cur = g[key] || [];
    if (!cur.includes(v)) setCell(key, [...cur, v]);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Column title="Give to AI" role="ai" cells={AI_CELLS} grid={g} onToggle={toggle} onRemove={remove} onAdd={addCustom} />
      <Column title="Keep human" role="human" cells={HUMAN_CELLS} grid={g} onToggle={toggle} onRemove={remove} onAdd={addCustom} />
    </div>
  );
}

function Column({
  title,
  role,
  cells,
  grid,
  onToggle,
  onRemove,
  onAdd,
}: {
  title: string;
  role: "ai" | "human";
  cells: Cell[];
  grid: Record<string, string[]>;
  onToggle: (k: string, v: string) => void;
  onRemove: (k: string, v: string) => void;
  onAdd: (k: string, v: string) => void;
}) {
  const accent = role === "ai" ? "text-ai" : "text-human";
  const ring = role === "ai" ? "border-blue-200" : "border-orange-200";
  return (
    <div className={"card border-2 p-4 " + ring}>
      <div className={"mb-3 text-sm font-bold uppercase tracking-wide " + accent}>{title}</div>
      <div className="space-y-3">
        {cells.map((c) => (
          <CellBox key={c.key} cell={c} assigned={grid[c.key] || []} onToggle={onToggle} onRemove={onRemove} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}

function CellBox({
  cell,
  assigned,
  onToggle,
  onRemove,
  onAdd,
}: {
  cell: Cell;
  assigned: string[];
  onToggle: (k: string, v: string) => void;
  onRemove: (k: string, v: string) => void;
  onAdd: (k: string, v: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const [open, setOpen] = useState(false);
  const isAi = cell.role === "ai";
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-baseline justify-between">
        <div>
          <span className={"font-semibold " + (isAi ? "text-ai" : "text-human")}>{cell.label}</span>
          <span className="ml-2 text-xs text-slate-400">{cell.gloss}</span>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="text-xs text-slate-400 hover:text-slate-600">
          {open ? "hide" : "verbs"}
        </button>
      </div>

      {assigned.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {assigned.map((v) => (
            <button
              key={v}
              onClick={() => onRemove(cell.key, v)}
              className={
                "group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium " +
                (isAi ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800")
              }
              title="Remove"
            >
              {v}
              <span className="opacity-40 group-hover:opacity-100">×</span>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
          {cell.verbs.map((v) => {
            const on = assigned.includes(v);
            return (
              <button
                key={v}
                onClick={() => onToggle(cell.key, v)}
                className={
                  "rounded-full border px-2.5 py-1 text-xs transition " +
                  (on ? "border-transparent bg-slate-800 text-white" : "border-slate-200 text-slate-500 hover:border-slate-400")
                }
              >
                {v}
              </button>
            );
          })}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAdd(cell.key, custom);
              setCustom("");
            }}
            className="flex w-full items-center gap-1 pt-1"
          >
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="add your own…"
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400"
            />
          </form>
        </div>
      )}
    </div>
  );
}
