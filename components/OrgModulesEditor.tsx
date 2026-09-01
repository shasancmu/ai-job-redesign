"use client";

import { useEffect, useMemo, useState } from "react";

type Mod = { slug: string; name: string; emoji: string; partner: string };
const MODE = (p: string) => (p === "group" ? "Live" : p === "human" ? "Paired" : "Solo");

// Director-only: choose which modules this organization makes available to its
// members. "All modules" grants the whole catalog; otherwise only the picked set.
export default function OrgModulesEditor({ orgId }: { orgId: string }) {
  const [catalog, setCatalog] = useState<Mod[]>([]);
  const [all, setAll] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [browse, setBrowse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);
  async function load() {
    try {
      const d = await fetch(`/api/org/modules?org=${encodeURIComponent(orgId)}`, { cache: "no-store" }).then((r) => r.json());
      if (d?.ok) { setCatalog(d.catalog || []); setAll(!!d.all); setSel(new Set(d.selected || [])); setBrowse(!!d.member_can_browse); }
    } catch { /* ignore */ }
  }

  const toggle = (slug: string) => setSel((s) => { const n = new Set(s); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });
  const count = all ? catalog.length : sel.size;

  async function save() {
    if (!all && sel.size === 0) { setErr("Pick at least one module, or choose All modules."); return; }
    setBusy(true); setMsg(""); setErr("");
    try {
      const d = await fetch("/api/org/modules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId, all, modules: [...sel], member_can_browse: browse }) }).then((r) => r.json());
      d?.ok ? setMsg("Saved.") : setErr(d?.error || "Couldn't save.");
    } catch { setErr("Something went wrong."); }
    setBusy(false);
  }

  const grouped = useMemo(() => catalog, [catalog]);

  return (
    <details className="rounded-2xl border border-line bg-white p-5">
      <summary className="cursor-pointer select-none text-sm font-bold text-ink">Available modules</summary>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate2">
        Choose which modules your members can use. <b>{count}</b> {count === 1 ? "module" : "modules"} available now.
      </p>

      <div className="mt-4 flex rounded-full border border-line bg-mist/40 p-0.5 text-xs font-semibold">
        <button onClick={() => setAll(true)} className={"rounded-full px-3 py-1 transition " + (all ? "bg-ink text-white" : "text-slate-500 hover:text-ink")}>All modules</button>
        <button onClick={() => setAll(false)} className={"rounded-full px-3 py-1 transition " + (!all ? "bg-ink text-white" : "text-slate-500 hover:text-ink")}>Choose specific</button>
      </div>

      {!all && (
        <div className="mt-3 grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-2">
          {grouped.map((m) => (
            <label key={m.slug} className={"flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm " + (sel.has(m.slug) ? "border-ai bg-ai/5" : "border-transparent hover:bg-mist")}>
              <input type="checkbox" checked={sel.has(m.slug)} onChange={() => toggle(m.slug)} />
              <span className="min-w-0 flex-1 truncate">{m.emoji} {m.name}</span>
              <span className={"shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold " + (MODE(m.partner) === "Live" ? "bg-sage/10 text-sage" : MODE(m.partner) === "Paired" ? "bg-sky-soft text-sky" : "bg-mist text-slate-400")}>{MODE(m.partner)}</span>
            </label>
          ))}
        </div>
      )}

      <label className="mt-4 flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={browse} onChange={(e) => setBrowse(e.target.checked)} />
        Let members browse the full available library (not only what an instructor assigned them)
      </label>

      {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
      <div className="mt-4"><button onClick={save} disabled={busy} className="btn-primary text-sm">{busy ? "…" : "Save"}</button></div>
    </details>
  );
}
