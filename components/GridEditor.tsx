"use client";

import { useState } from "react";
import { AI_CELLS, HUMAN_CELLS, emptyGrid, Cell } from "@/lib/exercise";

// Self-contained 2×4 editor. Controlled by `grid` + `onChange`.
// Each cell holds spelled-out contributions (short sentences), not just verbs.
export default function GridEditor({
  grid,
  onChange,
}: {
  grid: Record<string, string[]>;
  onChange: (grid: Record<string, string[]>) => void;
}) {
  const g = { ...emptyGrid(), ...(grid || {}) };
  const setCell = (key: string, items: string[]) => onChange({ ...g, [key]: items });
  const add = (key: string, text: string) => {
    const v = text.trim();
    if (!v) return;
    const cur = g[key] || [];
    if (!cur.includes(v)) setCell(key, [...cur, v]);
  };
  const remove = (key: string, item: string) =>
    setCell(key, (g[key] || []).filter((v) => v !== item));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Column title="Give to AI" role="ai" cells={AI_CELLS} grid={g} onAdd={add} onRemove={remove} />
      <Column title="Keep human" role="human" cells={HUMAN_CELLS} grid={g} onAdd={add} onRemove={remove} />
    </div>
  );
}

function Column({
  title,
  role,
  cells,
  grid,
  onAdd,
  onRemove,
}: {
  title: string;
  role: "ai" | "human";
  cells: Cell[];
  grid: Record<string, string[]>;
  onAdd: (k: string, v: string) => void;
  onRemove: (k: string, v: string) => void;
}) {
  const accent = role === "ai" ? "text-ai" : "text-human";
  const ring = role === "ai" ? "border-sky-soft" : "border-clay-soft";
  return (
    <div className={"card border-2 p-4 " + ring}>
      <div className={"mb-3 text-sm font-bold uppercase tracking-wide " + accent}>{title}</div>
      <div className="space-y-3">
        {cells.map((c) => (
          <CellBox key={c.key} cell={c} items={grid[c.key] || []} onAdd={onAdd} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

function CellBox({
  cell,
  items,
  onAdd,
  onRemove,
}: {
  cell: Cell;
  items: string[];
  onAdd: (k: string, v: string) => void;
  onRemove: (k: string, v: string) => void;
}) {
  const [text, setText] = useState("");
  const [starters, setStarters] = useState(false);
  const isAi = cell.role === "ai";
  const tint = isAi ? "bg-sky-soft" : "bg-clay-soft";
  const dot = isAi ? "text-ai" : "text-human";

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    onAdd(cell.key, text);
    setText("");
  }

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-baseline justify-between">
        <div>
          <span className={"font-semibold " + dot}>{cell.label}</span>
          <span className="ml-2 text-xs text-slate2">{cell.gloss}</span>
        </div>
        <button
          type="button"
          onClick={() => setStarters((s) => !s)}
          className="text-xs text-slate2 hover:text-ink"
        >
          {starters ? "hide" : "starters"}
        </button>
      </div>

      {items.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {items.map((v) => (
            <div
              key={v}
              className={"group flex items-start gap-2 rounded-lg px-3 py-2 text-sm text-ink " + tint}
            >
              <span className="flex-1 leading-snug">{v}</span>
              <button
                type="button"
                onClick={() => onRemove(cell.key, v)}
                className="mt-0.5 shrink-0 text-slate2 opacity-50 hover:opacity-100"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="mt-2 flex items-start gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
          rows={2}
          placeholder={cell.example}
          className="min-h-[44px] w-full resize-none rounded-lg border border-line px-3 py-2 text-sm leading-snug outline-none focus:border-sage"
        />
        <button type="submit" disabled={!text.trim()} className="btn-ghost mt-0.5 px-3 py-2 text-sm">
          Add
        </button>
      </form>

      {starters && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2">
          {cell.verbs.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setText((t) => (t ? `${t} ${v.toLowerCase()}` : `${v} `))}
              className="rounded-full border border-line px-2.5 py-1 text-xs text-slate2 hover:border-slate-400"
              title="Add to your sentence"
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
