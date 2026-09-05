"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Target = { id: string; label: string; code?: string; kind: "class" | "unit" };

// The post-publish hinge: make a just-published module available to the classes /
// programs the author controls, in one place. Reusable for any module slug.
export default function AssignModule({ slug }: { slug: string; name?: string }) {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Target[]>([]);
  const [units, setUnits] = useState<Target[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/modules/assign?slug=${encodeURIComponent(slug)}`);
        const d = await r.json();
        if (r.ok) {
          setClasses(d.classes || []); setUnits(d.units || []);
          setChecked(new Set([...(d.classIds || []), ...(d.unitIds || [])]));
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [slug]);

  function toggle(id: string) { setChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); setSaved(false); }

  async function save() {
    setBusy(true); setErr(""); setSaved(false);
    try {
      const classIds = classes.filter((c) => checked.has(c.id)).map((c) => c.id);
      const unitIds = units.filter((u) => checked.has(u.id)).map((u) => u.id);
      const r = await fetch("/api/modules/assign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, classIds, unitIds }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't save.");
      setSaved(true);
    } catch (e: any) { setErr(e?.message || "Couldn't save."); }
    setBusy(false);
  }

  if (loading) return <div className="rounded-xl border border-line bg-white p-4 text-sm text-slate-400">Loading your classes…</div>;
  if (!classes.length && !units.length) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-mist/30 p-4 text-sm text-slate2">
        Published. To put it in front of students, <Link href="/team" className="text-ai underline">create a class</Link>, then assign it here.
      </div>
    );
  }

  const checkedClasses = classes.filter((c) => checked.has(c.id));

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="lbl">Make it available to a class</div>
      <p className="mt-0.5 text-xs text-slate-500">Students in a class you pick will see it as assigned work.</p>
      <div className="mt-2 space-y-1.5">
        {classes.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm">
            <input type="checkbox" checked={checked.has(c.id)} onChange={() => toggle(c.id)} />
            <span className="min-w-0 flex-1 truncate text-ink">{c.label}</span>
            <code className="shrink-0 rounded bg-mist px-1.5 py-0.5 text-[11px] text-slate2">{c.code}</code>
          </label>
        ))}
        {units.map((u) => (
          <label key={u.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm">
            <input type="checkbox" checked={checked.has(u.id)} onChange={() => toggle(u.id)} />
            <span className="min-w-0 flex-1 truncate text-ink">{u.label}</span>
            <span className="shrink-0 rounded-full bg-sky-soft px-2 py-0.5 text-[11px] text-sky">program</span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary text-sm disabled:opacity-50">{busy ? "Saving…" : "Assign"}</button>
        {saved && <span className="text-xs font-semibold text-sage">Assigned ✓</span>}
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
      {saved && checkedClasses.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="text-xs text-slate-500">Share the join link with students:</div>
          {checkedClasses.map((c) => (
            <div key={c.id} className="mt-1 truncate text-xs"><code className="rounded bg-mist px-1.5 py-0.5 text-slate2">{typeof window !== "undefined" ? window.location.origin : ""}/{c.code}</code></div>
          ))}
        </div>
      )}
    </div>
  );
}
