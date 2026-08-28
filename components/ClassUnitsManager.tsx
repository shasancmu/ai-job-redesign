"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MODULES } from "@/lib/modules";

type DynModule = { slug: string; name: string; emoji?: string };
type ClassUnit = { id: string; name: string; modules: string[]; is_default: boolean; cohorts: number; canEdit?: boolean };

// Manage the CLASS tier (dept/course): a class owns a module set that every
// cohort under it inherits. Director / superadmin of the active school only.
export default function ClassUnitsManager({ roleplayModules = [], interviewModules = [], orgName }: { roleplayModules?: DynModule[]; interviewModules?: DynModule[]; orgName?: string | null }) {
  const available = useMemo(() => {
    const seen = new Set<string>();
    const list: DynModule[] = [];
    for (const m of MODULES) { if ((m as any).hidden) continue; if (seen.has(m.slug)) continue; seen.add(m.slug); list.push({ slug: m.slug, name: m.name, emoji: (m as any).emoji }); }
    for (const m of [...roleplayModules, ...interviewModules]) { if (seen.has(m.slug)) continue; seen.add(m.slug); list.push(m); }
    return list;
  }, [roleplayModules, interviewModules]);
  const nameOf = (slug: string) => available.find((m) => m.slug === slug)?.name || slug;

  const [classes, setClasses] = useState<ClassUnit[] | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [noOrg, setNoOrg] = useState(false);
  const [editing, setEditing] = useState<null | "new" | string>(null);
  const [name, setName] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    try {
      const d = await fetch("/api/class-units", { cache: "no-store" }).then((r) => r.json());
      setClasses(d.classes || []);
      setCanCreate(!!d.canCreate);
      setNoOrg(!d.orgId);
    } catch { setClasses([]); }
  }

  function startNew() { setEditing("new"); setName(""); setSel(new Set()); setErr(""); }
  function startEdit(c: ClassUnit) { setEditing(c.id); setName(c.name); setSel(new Set(c.modules)); setErr(""); }
  function startDuplicate(c: ClassUnit) { setEditing("new"); setName(`${c.name} (copy)`); setSel(new Set(c.modules)); setErr(""); }
  const toggle = (slug: string) => setSel((s) => { const n = new Set(s); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });

  async function save() {
    if (!name.trim()) { setErr("Give the class a name."); return; }
    setBusy(true); setErr("");
    const body: any = { name: name.trim(), modules: [...sel] };
    if (editing && editing !== "new") body.id = editing;
    const res = await fetch("/api/class-units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || d.error) { setErr(d.error || "Couldn't save."); return; }
    setEditing(null); await load();
  }

  if (classes === null) return <div className="text-sm text-slate-400">Loading…</div>;
  if (noOrg) return <div className="rounded-xl bg-mist p-4 text-sm text-slate2">Switch to a school or company (top-right) to manage its classes. Personal modules don&apos;t use classes.</div>;

  return (
    <div>
      {canCreate ? (
        editing ? (
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="text-sm font-bold text-ink">{editing === "new" ? "New class" : "Edit class"}</div>
            <label className="lbl mt-3">Class name</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Strategy 101, or Marketing dept" autoFocus />
            <div className="mt-4">
              <div className="lbl">Modules every cohort in this class inherits</div>
              <p className="mb-2 text-xs text-slate-500">Cohorts (sections/sessions) under this class get these automatically, and can add their own on top.</p>
              <div className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-2">
                {available.map((m) => (
                  <label key={m.slug} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${sel.has(m.slug) ? "border-ai bg-ai/5" : "border-transparent hover:bg-mist"}`}>
                    <input type="checkbox" checked={sel.has(m.slug)} onChange={() => toggle(m.slug)} />
                    <span className="truncate">{m.emoji ? m.emoji + " " : ""}{m.name}</span>
                  </label>
                ))}
              </div>
              <div className="mt-1 text-xs text-slate-400">{sel.size} selected</div>
            </div>
            {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
            <div className="mt-4 flex items-center gap-2">
              <button onClick={save} disabled={busy} className="btn-primary text-sm">{busy ? "Saving…" : "Save class"}</button>
              <button onClick={() => setEditing(null)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={startNew} className="btn-primary text-sm">+ New class</button>
        )
      ) : (
        <div className="rounded-xl bg-mist p-3 text-sm text-slate2">You need instructor status in {orgName || "this school"} to create classes. Ask a director to add you.</div>
      )}

      <div className="mt-5 space-y-2">
        {classes.length === 0 && !editing && <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-slate-400">No classes yet. A class groups your cohorts and shares a module set with them.</div>}
        {classes.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white p-4">
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink">{c.name}{c.is_default && <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[11px] font-normal text-slate-500">default</span>}</div>
              <div className="mt-0.5 text-xs text-slate-500">{c.cohorts} cohort{c.cohorts === 1 ? "" : "s"} · {c.modules.length} module{c.modules.length === 1 ? "" : "s"} inherited{c.modules.length ? `: ${c.modules.slice(0, 3).map(nameOf).join(", ")}${c.modules.length > 3 ? "…" : ""}` : ""}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canCreate && <button onClick={() => startDuplicate(c)} className="btn-ghost text-sm">Duplicate</button>}
              {c.canEdit && <button onClick={() => startEdit(c)} className="btn-ghost text-sm">Edit</button>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 text-sm text-slate-500">Put cohorts into a class from the <Link href="/facilitator/cohorts" className="font-medium text-ai hover:underline">Cohorts</Link> page (each cohort has a &ldquo;Class&rdquo; picker).</div>
    </div>
  );
}
