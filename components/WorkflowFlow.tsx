"use client";

import { Fragment } from "react";
import { STEP_ROLES, ROLE_META } from "@/lib/workflow";

type Node = { id: string; text: string; role: string };

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

// A vertical flow diagram of workflow steps, colored by who does them.
export default function WorkflowFlow({
  steps,
  onChange,
  editable = true,
  onActive,
}: {
  steps: Node[];
  onChange?: (steps: Node[]) => void;
  editable?: boolean;
  onActive?: (active: boolean) => void;
}) {
  const set = (next: Node[]) => onChange?.(next);
  const insertAt = (i: number, role = "human") => {
    const next = [...steps];
    next.splice(i, 0, { id: newId(), text: "", role });
    set(next);
  };
  const update = (id: string, patch: Partial<Node>) =>
    set(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (id: string) => set(steps.filter((s) => s.id !== id));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };

  if (steps.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-slate2">
        No steps yet.
        {editable && (
          <div className="mt-3">
            <button onClick={() => insertAt(0)} className="btn-ghost text-sm">
              + Add the first step
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      {steps.map((s, i) => {
        const meta = ROLE_META[s.role] || ROLE_META[""];
        return (
          <Fragment key={s.id}>
            <div
              className="rounded-2xl border-2 p-3.5"
              style={{ borderColor: meta.color, backgroundColor: meta.color + "12" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  {i + 1}
                </span>

                {editable ? (
                  <div className="flex flex-1 flex-wrap items-center gap-1">
                    {STEP_ROLES.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => update(s.id, { role: r.key })}
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold transition"
                        style={
                          s.role === r.key
                            ? { backgroundColor: r.color, color: "#fff" }
                            : { color: r.color, border: `1px solid ${r.color}55` }
                        }
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.label}
                  </span>
                )}

                {editable && (
                  <div className="ml-auto flex items-center gap-0.5">
                    <IconBtn title="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                      ↑
                    </IconBtn>
                    <IconBtn title="Move down" onClick={() => move(i, 1)} disabled={i === steps.length - 1}>
                      ↓
                    </IconBtn>
                    <IconBtn title="Split — add a step after" onClick={() => insertAt(i + 1, s.role)}>
                      ⧉
                    </IconBtn>
                    <IconBtn title="Delete" onClick={() => remove(s.id)}>
                      ✕
                    </IconBtn>
                  </div>
                )}
              </div>

              {editable ? (
                <textarea
                  value={s.text}
                  onChange={(e) => update(s.id, { text: e.target.value })}
                  onFocus={() => onActive?.(true)}
                  onBlur={() => onActive?.(false)}
                  rows={1}
                  placeholder="Describe this step…"
                  className="mt-2 w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm leading-snug outline-none focus:border-sage"
                />
              ) : (
                <p className="mt-2 px-1 text-sm leading-snug text-ink">{s.text || "—"}</p>
              )}
            </div>

            {/* connector */}
            {i < steps.length - 1 ? (
              <div className="relative flex h-8 items-center justify-center">
                <div className="h-full w-px bg-slate-300" />
                <div className="absolute text-slate-400">▾</div>
                {editable && (
                  <button
                    onClick={() => insertAt(i + 1)}
                    title="Insert a step here"
                    className="absolute right-1/2 mr-4 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-white text-xs text-slate2 hover:border-sage hover:text-sage"
                  >
                    +
                  </button>
                )}
              </div>
            ) : (
              editable && (
                <div className="mt-3 text-center">
                  <button onClick={() => insertAt(steps.length)} className="btn-ghost text-sm">
                    + Add step
                  </button>
                </div>
              )
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: any;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded-lg text-xs text-slate2 hover:bg-white disabled:opacity-30"
    >
      {children}
    </button>
  );
}
