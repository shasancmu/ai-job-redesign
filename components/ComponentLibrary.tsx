"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// A small inline "components" bar for one kind of reusable block (character,
// rubric, or scenario set). Save the current section to your library, or drop a
// saved one in. Owner-scoped via RLS; the editor merges whatever comes back.
export default function ComponentLibrary({
  me, kind, label, summarize, getData, onInsert,
}: {
  me: string;
  kind: "character" | "rubric" | "scenario-set";
  label: string;
  summarize?: (data: any) => string; // one-line preview under each saved item
  getData: () => any;
  onInsert: (data: any) => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[] | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items === null) {
      const { data } = await supabase.from("module_components").select("id, name, data, updated_at").eq("kind", kind).order("updated_at", { ascending: false });
      setItems(data || []);
    }
  }

  async function saveAs() {
    const name = (window.prompt(`Save this ${label} to your library as:`) || "").trim();
    if (!name) return;
    setBusy("save"); setMsg("");
    const { data, error } = await supabase.from("module_components").insert({ owner_id: me, kind, name, data: getData() }).select("id, name, data, updated_at").single();
    setBusy("");
    if (error) { setMsg(`Save failed: ${error.message}`); return; }
    setItems((it) => [data, ...(it || [])]);
    setMsg("Saved to library ✓"); setTimeout(() => setMsg(""), 1800);
  }

  async function remove(id: string) {
    await supabase.from("module_components").delete().eq("id", id);
    setItems((it) => (it || []).filter((x) => x.id !== id));
  }

  return (
    <div className="mb-3 rounded-lg border border-dashed border-line bg-mist/40 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Library</span>
        <button onClick={saveAs} disabled={busy === "save"} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink shadow-sm hover:text-ai">{busy === "save" ? "Saving..." : `Save this ${label}`}</button>
        <button onClick={toggle} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink shadow-sm hover:text-ai">{open ? "Close" : `Insert a ${label} ▾`}</button>
        {msg && <span className="text-xs text-sage">{msg}</span>}
      </div>

      {open && (
        <div className="mt-2">
          {items === null ? (
            <div className="text-xs text-slate-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-xs text-slate-400">No saved {label}s yet. Save one with the button above, then reuse it in any module.</div>
          ) : (
            <div className="space-y-1">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-ink">{it.name}</div>
                    {summarize && <div className="truncate text-[11px] text-slate-400">{summarize(it.data)}</div>}
                  </div>
                  <button onClick={() => { onInsert(it.data); setOpen(false); setMsg(`Inserted “${it.name}” ✓`); setTimeout(() => setMsg(""), 1800); }} className="shrink-0 rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-semibold text-sage">Insert</button>
                  <button onClick={() => remove(it.id)} title="Delete" className="shrink-0 text-slate-300 hover:text-red-500">✕</button>
                </div>
              ))}
            </div>
          )}
          {kind === "scenario-set" && items && items.length > 0 && (
            <p className="mt-1 text-[11px] text-amber-700">Inserting a scenario set replaces the current probes and scenarios.</p>
          )}
        </div>
      )}
    </div>
  );
}
