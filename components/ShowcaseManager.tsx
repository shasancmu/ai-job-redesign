"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { makePhotoCode } from "@/lib/photo";

type Item = { id: string; title: string; presenter: string };
type Session = { id: string; code: string; title: string; status: string; created_at: string };

function newId() { return Math.random().toString(36).slice(2, 9); }

export default function ShowcaseManager({ me, initial }: { me: string; initial: Session[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState<Session[]>(initial);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<Item[]>([{ id: newId(), title: "", presenter: "" }, { id: newId(), title: "", presenter: "" }]);
  const [busy, setBusy] = useState(false);

  function setItem(id: string, patch: Partial<Item>) { setItems((its) => its.map((it) => (it.id === id ? { ...it, ...patch } : it))); }
  function addItem() { setItems((its) => [...its, { id: newId(), title: "", presenter: "" }]); }
  function removeItem(id: string) { setItems((its) => its.filter((it) => it.id !== id)); }

  const clean = items.map((it) => ({ ...it, title: it.title.trim(), presenter: it.presenter.trim() })).filter((it) => it.title);

  async function create() {
    if (!clean.length) return;
    setBusy(true);
    let code = "";
    for (let i = 0; i < 5; i++) {
      code = makePhotoCode();
      const { error } = await supabase.from("showcase_sessions").insert({ code, host_id: me, title: title.trim(), items: clean, current: -1 });
      if (!error) break;
      code = "";
    }
    setBusy(false);
    if (!code) return;
    router.push(`/facilitator/showcase/${code}/present`);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this showcase and its feedback?")) return;
    await supabase.from("showcase_sessions").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="text-sm font-semibold text-ink">New showcase</div>
        <label className="lbl mt-3">Session title</label>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Final project presentations" />

        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">The line-up (in order)</div>
        <div className="mt-2 space-y-2">
          {items.map((it, i) => (
            <div key={it.id} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-sm text-slate-400">{i + 1}</span>
              <input className="field flex-1" value={it.title} onChange={(e) => setItem(it.id, { title: e.target.value })} placeholder="Presentation title" />
              <input className="field w-40" value={it.presenter} onChange={(e) => setItem(it.id, { presenter: e.target.value })} placeholder="Presenter (optional)" />
              <button onClick={() => removeItem(it.id)} disabled={items.length <= 1} className="shrink-0 text-slate-400 hover:text-clay disabled:opacity-30" title="Remove">✕</button>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="btn-ghost mt-2 text-sm">+ Add a presentation</button>

        <button onClick={create} disabled={busy || !clean.length} className="btn-primary mt-4 w-full disabled:opacity-50">{busy ? "Starting..." : `Start showcase (${clean.length} in the line-up)`}</button>
      </div>

      <div className="space-y-2">
        {rows.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-line bg-white p-3">
            <div>
              <span className="font-mono text-lg font-bold tracking-widest text-ink">{s.code}</span>
              {s.title && <span className="ml-3 text-sm text-slate-500">{s.title}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/facilitator/showcase/${s.code}/present`} className="btn-ghost text-sm">Present →</Link>
              <button onClick={() => remove(s.id)} className="text-sm text-slate-400 hover:text-clay">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
