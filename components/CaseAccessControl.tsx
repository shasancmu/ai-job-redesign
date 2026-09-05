"use client";

import { useState } from "react";
import Link from "next/link";

// Instructor control: make a case open to anyone with the link, or restrict it to
// students enrolled in one of the instructor's classes.
export default function CaseAccessControl({ slug, initialAccess, initialCohorts, classes }: {
  slug: string; initialAccess: "public" | "enrolled"; initialCohorts: string[]; classes: { code: string; name: string }[];
}) {
  const [access, setAccess] = useState<"public" | "enrolled">(initialAccess);
  const [picked, setPicked] = useState<Set<string>>(new Set(initialCohorts));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  function toggle(code: string) {
    setPicked((s) => { const n = new Set(s); n.has(code) ? n.delete(code) : n.add(code); return n; });
    setSaved(false);
  }

  async function save() {
    setBusy(true); setErr(""); setSaved(false);
    try {
      const res = await fetch("/api/cases/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, access, cohorts: access === "enrolled" ? [...picked] : [] }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't save.");
      setSaved(true);
    } catch (e: any) { setErr(e?.message || "Couldn't save."); }
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="lbl">Who can open this case</div>
      <div className="mt-2 flex rounded-full border border-line bg-mist/50 p-0.5 text-sm font-semibold">
        <button onClick={() => { setAccess("public"); setSaved(false); }} className={"flex-1 rounded-full px-3 py-1.5 transition " + (access === "public" ? "bg-ink text-white" : "text-slate2 hover:text-ink")}>Anyone with the link</button>
        <button onClick={() => { setAccess("enrolled"); setSaved(false); }} className={"flex-1 rounded-full px-3 py-1.5 transition " + (access === "enrolled" ? "bg-ink text-white" : "text-slate2 hover:text-ink")}>Enrolled students only</button>
      </div>

      {access === "enrolled" && (
        <div className="mt-3">
          <div className="text-xs text-slate-500">Assign to your classes — only students who joined one of these can open it.</div>
          {classes.length === 0 ? (
            <div className="mt-2 rounded-lg border border-dashed border-line bg-mist/30 p-3 text-xs text-slate-500">
              You don't own a class yet. <Link href="/team" className="text-ai underline">Create one</Link>, share its join code with students, then assign this case to it.
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              {classes.map((c) => (
                <label key={c.code} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm">
                  <input type="checkbox" checked={picked.has(c.code)} onChange={() => toggle(c.code)} />
                  <span className="min-w-0 flex-1 truncate text-ink">{c.name}</span>
                  <code className="shrink-0 rounded bg-mist px-1.5 py-0.5 text-[11px] text-slate2">{c.code}</code>
                </label>
              ))}
            </div>
          )}
          {access === "enrolled" && picked.size === 0 && classes.length > 0 && <p className="mt-1.5 text-xs text-clay">Pick at least one class, or no one but you will be able to open it.</p>}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary text-sm disabled:opacity-50">{busy ? "Saving…" : "Save access"}</button>
        {saved && <span className="text-xs font-semibold text-sage">Saved ✓</span>}
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  );
}
