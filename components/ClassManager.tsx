"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MODULES } from "@/lib/modules";
import { normalizeCode } from "@/lib/classes";

type Klass = { id: string; code: string; name: string; modules: string[]; members: number };

export default function ClassManager() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, []);

  async function load() {
    const d = await fetch("/api/classes", { cache: "no-store" }).then((r) => r.json());
    setClasses(d.classes || []);
  }

  function toggle(slug: string) {
    const next = new Set(picked);
    next.has(slug) ? next.delete(slug) : next.add(slug);
    setPicked(next);
  }

  async function create() {
    setErr(null);
    const c = normalizeCode(code);
    if (!name.trim() || !c) {
      setErr("Give the class a name and a code.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code: c, modules: Array.from(picked) }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(d.error || "Couldn't save.");
      return;
    }
    setName("");
    setCode("");
    setPicked(new Set());
    load();
  }

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-ink">New class</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="lbl">Class name</label>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chief AI Officer — Sep 27"
            />
          </div>
          <div>
            <label className="lbl">Join code (the link)</label>
            <input
              className="field font-mono uppercase"
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              placeholder="CAIO26SEP27"
            />
            {code && (
              <div className="mt-1 truncate text-xs text-slate2">
                {origin}/{normalizeCode(code)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="lbl">Modules in this class</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODULES.map((m) => (
              <button
                key={m.slug}
                type="button"
                onClick={() => toggle(m.slug)}
                className={
                  "flex items-center justify-between rounded-xl border-2 px-3 py-2.5 text-left transition " +
                  (picked.has(m.slug) ? "border-sage bg-sage-soft" : "border-line hover:border-slate-300")
                }
              >
                <span className="text-sm font-medium text-ink">{m.name}</span>
                {picked.has(m.slug) && <span className="text-sage">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {err && <p className="mt-3 text-sm text-clay">{err}</p>}
        <button onClick={create} disabled={busy} className="btn-primary mt-4">
          {busy ? "Saving…" : "Create class"}
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate2">
          Your classes
        </h2>
        {classes.length === 0 ? (
          <p className="text-slate2">No classes yet.</p>
        ) : (
          <ul className="space-y-3">
            {classes.map((c) => (
              <li key={c.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-ink">{c.name}</div>
                    <div className="mt-0.5 font-mono text-sm text-sage">{origin}/{c.code}</div>
                    <div className="mt-1 text-sm text-slate2">
                      {c.members} joined · {(c.modules || []).length} modules
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigator.clipboard?.writeText(`${origin}/${c.code}`)}
                      className="btn-ghost text-sm"
                    >
                      Copy link
                    </button>
                    <Link href={`/facilitator?cohort=${encodeURIComponent(c.code)}`} className="btn-primary text-sm">
                      View results →
                    </Link>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(c.modules || []).map((slug) => {
                    const m = MODULES.find((x) => x.slug === slug);
                    return (
                      <span key={slug} className="rounded-full bg-mist px-2 py-0.5 text-xs text-slate2">
                        {m?.name || slug}
                      </span>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
