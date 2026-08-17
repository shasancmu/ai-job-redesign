"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MODULES } from "@/lib/modules";
import { normalizeCode } from "@/lib/classes";

type Klass = { id: string; code: string; name: string; modules: string[]; members: number };

const nameOf = (slug: string) => MODULES.find((m) => m.slug === slug)?.name || slug;

export default function ClassManager() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [order, setOrder] = useState<string[]>([]); // ordered module slugs
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

  const add = (slug: string) => setOrder((o) => (o.includes(slug) ? o : [...o, slug]));
  const remove = (slug: string) => setOrder((o) => o.filter((s) => s !== slug));
  const move = (i: number, dir: -1 | 1) =>
    setOrder((o) => {
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const available = MODULES.filter((m) => !order.includes(m.slug));

  function edit(k: Klass) {
    setName(k.name);
    setCode(k.code);
    setOrder(k.modules || []);
    setErr(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setName("");
    setCode("");
    setOrder([]);
  }

  async function del(k: Klass) {
    if (
      !confirm(
        `Delete "${k.name}"? People can no longer join at /${k.code}. Their collected responses stay in the results — download them first if you need them.`
      )
    )
      return;
    await fetch(`/api/classes?code=${encodeURIComponent(k.code)}`, { method: "DELETE" });
    load();
  }

  async function save() {
    setErr(null);
    const c = normalizeCode(code);
    if (!name.trim() || !c) {
      setErr("Give the cohort a name and a code.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code: c, modules: order }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(d.error || "Couldn't save.");
      return;
    }
    reset();
    load();
  }

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-ink">New cohort</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="lbl">Cohort name</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chief AI Officer — Sep 27" />
          </div>
          <div>
            <label className="lbl">Join code (the link)</label>
            <input
              className="field font-mono uppercase"
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              placeholder="CAIO26SEP27"
            />
            {code && <div className="mt-1 truncate text-xs text-slate2">{origin}/{normalizeCode(code)}</div>}
          </div>
        </div>

        {/* Ordered module list */}
        <div className="mt-5">
          <label className="lbl">Modules — in the order participants will do them</label>
          {order.length === 0 ? (
            <p className="text-sm text-slate2">Add modules below; drag order with the arrows.</p>
          ) : (
            <ol className="space-y-2">
              {order.map((slug, i) => (
                <li key={slug} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
                  <span className="w-5 text-right text-sm font-semibold text-slate2">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-ink">{nameOf(slug)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="rounded-lg border border-line px-2 py-1 text-xs text-slate2 hover:bg-mist disabled:opacity-30"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === order.length - 1}
                      className="rounded-lg border border-line px-2 py-1 text-xs text-slate2 hover:bg-mist disabled:opacity-30"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(slug)}
                      className="rounded-lg px-2 py-1 text-xs text-clay hover:bg-clay-soft"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {available.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate2">Add a module</div>
              <div className="flex flex-wrap gap-2">
                {available.map((m) => (
                  <button
                    key={m.slug}
                    type="button"
                    onClick={() => add(m.slug)}
                    className="rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:border-sage hover:bg-sage-soft"
                  >
                    + {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {err && <p className="mt-3 text-sm text-clay">{err}</p>}
        <div className="mt-4 flex items-center gap-3">
          <button onClick={save} disabled={busy} className="btn-primary">
            {busy ? "Saving…" : "Save cohort"}
          </button>
          {(name || code || order.length > 0) && (
            <button onClick={reset} className="text-sm text-slate2 hover:text-ink">
              Clear
            </button>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate2">Your cohorts</h2>
        {classes.length === 0 ? (
          <p className="text-slate2">No cohorts yet.</p>
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
                    <button onClick={() => edit(c)} className="btn-ghost text-sm">
                      Edit
                    </button>
                    <button
                      onClick={() => navigator.clipboard?.writeText(`${origin}/${c.code}`)}
                      className="btn-ghost text-sm"
                    >
                      Copy link
                    </button>
                    <button onClick={() => del(c)} className="text-sm text-clay hover:underline">
                      Delete
                    </button>
                    <Link href={`/facilitator?cohort=${encodeURIComponent(c.code)}`} className="btn-primary text-sm">
                      View results →
                    </Link>
                  </div>
                </div>
                <ol className="mt-3 flex flex-wrap gap-1.5">
                  {(c.modules || []).map((slug, i) => (
                    <li key={slug} className="rounded-full bg-mist px-2 py-0.5 text-xs text-slate2">
                      {i + 1}. {nameOf(slug)}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
