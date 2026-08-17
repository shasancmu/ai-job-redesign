"use client";

import { useState } from "react";
import Link from "next/link";
import { moduleByExercise } from "@/lib/modules";

// Past/started sessions — hidden by default (they pile up), with the option to
// show them and delete your own rooms off the dashboard.
export default function SessionsPanel({ sessions, me }: { sessions: any[]; me: string }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<any[]>(sessions);
  const [busy, setBusy] = useState<string | null>(null);

  async function del(id: string, code: string) {
    if (
      !window.confirm(
        `Delete room ${code}? This permanently removes it and everything in it. This can't be undone.`
      )
    )
      return;
    setBusy(id);
    try {
      const r = await fetch("/api/sessions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (r.ok) {
        setList((l) => l.filter((s) => s.id !== id));
      } else {
        const d = await r.json().catch(() => ({}));
        window.alert(d.error || "Couldn't delete.");
      }
    } catch {
      window.alert("Couldn't delete.");
    } finally {
      setBusy(null);
    }
  }

  if (list.length === 0) {
    return <p className="text-slate-500">Nothing yet — open a module above to begin.</p>;
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-slate-500 hover:text-ink"
        aria-expanded={open}
      >
        {open ? "▾ Hide" : "▸ Show"} your sessions ({list.length})
      </button>

      {open && (
        <ul className="mt-3 space-y-2">
          {list.map((s) => {
            const m = moduleByExercise(s.exercise || "job");
            return (
              <li
                key={s.id}
                className="card flex items-center justify-between gap-3 px-4 py-3 hover:border-slate-300"
              >
                <Link href={`/room/${s.code}`} className="flex flex-1 items-center gap-3">
                  <span className="font-mono text-lg font-semibold tracking-widest">{s.code}</span>
                  <span className="text-sm text-slate-500">{m?.name || s.exercise}</span>
                </Link>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "rounded-full px-2.5 py-1 text-xs font-medium " +
                      (s.status === "done"
                        ? "bg-green-100 text-green-700"
                        : s.status === "active"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600")
                    }
                  >
                    {s.status}
                  </span>
                  {s.host_id === me && (
                    <button
                      onClick={() => del(s.id, s.code)}
                      disabled={busy === s.id}
                      title="Delete this room"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      {busy === s.id ? "…" : "✕"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
