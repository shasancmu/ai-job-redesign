"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MODULES } from "@/lib/modules";
import { normalizeCode } from "@/lib/classes";
import { LANGUAGES } from "@/components/LanguagePicker";
import { I18N_ENABLED } from "@/lib/flags";

type Klass = { id: string; code: string; name: string; modules: string[]; members: number; language?: string; kind?: string; allowed_emails?: string[] };

const nameOf = (slug: string) => MODULES.find((m) => m.slug === slug)?.name || slug;

export default function ClassManager() {
  const [classes, setClasses] = useState<Klass[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("English");
  const [kind, setKind] = useState<"teaching" | "enterprise">("teaching");
  const [emails, setEmails] = useState(""); // enterprise invite list (one per line)
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
    setLanguage(k.language || "English");
    setKind((k.kind as any) || "teaching");
    setEmails(((k.allowed_emails as any) || []).join("\n"));
    setOrder(k.modules || []);
    setErr(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setName("");
    setCode("");
    setLanguage("English");
    setKind("teaching");
    setEmails("");
    setOrder([]);
  }

  async function del(k: Klass) {
    if (
      !confirm(
        `Delete "${k.name}"? People can no longer join at /${k.code}. Their collected responses stay in the results. Download them first if you need them.`
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
      body: JSON.stringify({
        name,
        code: c,
        modules: order,
        language,
        kind,
        allowed_emails: kind === "enterprise" ? emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean) : [],
      }),
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
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chief AI Officer, Sep 27" />
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

        {/* Cohort type */}
        <div className="mt-4">
          <label className="lbl">Cohort type</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              { k: "teaching", title: "Teaching / class", sub: "Open join. Selected modules free; students can buy $19 all-access." },
              { k: "enterprise", title: "Enterprise (contract)", sub: "Invite-only by email. Comped, no online payment." },
            ] as const).map((o) => (
              <button
                key={o.k}
                type="button"
                onClick={() => setKind(o.k)}
                className={"rounded-xl border-2 p-3 text-left transition " + (kind === o.k ? "border-ink bg-slate-50" : "border-slate-200 hover:border-slate-300")}
              >
                <div className="text-sm font-semibold">{o.title}</div>
                <div className="text-xs text-slate-400">{o.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {kind === "enterprise" && (
          <div className="mt-4">
            <label className="lbl">Invited emails (one per line)</label>
            <textarea
              className="field min-h-[110px] font-mono text-sm"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder={"alex@acme.com\njordan@acme.com"}
            />
            <p className="mt-1 text-xs text-slate-400">Only these addresses can join at the link. {emails.split(/[\s,;]+/).filter(Boolean).length} listed.</p>
          </div>
        )}

        {I18N_ENABLED && (
          <div className="mt-4 max-w-xs">
            <label className="lbl">Language (AI content runs in this)</label>
            <select className="field" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate2">Everyone who joins this cohort has their exercises run in this language.</p>
          </div>
        )}

        {/* Ordered module list */}
        <div className="mt-5">
          <label className="lbl">Modules: in the order participants will do them</label>
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
