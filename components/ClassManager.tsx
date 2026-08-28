"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MODULES } from "@/lib/modules";
import { normalizeCode } from "@/lib/classes";
import { LANGUAGES } from "@/components/LanguagePicker";
import { I18N_ENABLED } from "@/lib/flags";

type Klass = { id: string; code: string; name: string; modules: string[]; members: number; language?: string; kind?: string; allowed_emails?: string[]; org_id?: string | null; class_unit_id?: string | null };
type ClassUnitLite = { id: string; name: string; modules: string[] };

type DynModule = { slug: string; name: string; emoji?: string };

export default function ClassManager({ orgs = [], defaultOrgId = "", roleplayModules = [], interviewModules = [] }: { orgs?: { id: string; name: string }[]; defaultOrgId?: string; roleplayModules?: DynModule[]; interviewModules?: DynModule[] }) {
  const rpBySlug = useMemo(() => Object.fromEntries(roleplayModules.map((m) => [m.slug, m])), [roleplayModules]);
  const ivBySlug = useMemo(() => Object.fromEntries(interviewModules.map((m) => [m.slug, m])), [interviewModules]);
  const nameOf = (slug: string) => MODULES.find((m) => m.slug === slug)?.name || rpBySlug[slug]?.name || ivBySlug[slug]?.name || slug;
  const isRoleplay = (slug: string) => !!rpBySlug[slug];
  const isCustom = (slug: string) => !!ivBySlug[slug];
  const [classes, setClasses] = useState<Klass[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [orgId, setOrgId] = useState(defaultOrgId);
  const [language, setLanguage] = useState("English");
  const [kind, setKind] = useState<"teaching" | "enterprise">("teaching");
  const [emails, setEmails] = useState(""); // enterprise invite list (one per line)
  const [order, setOrder] = useState<string[]>([]); // ordered module slugs
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [classUnitId, setClassUnitId] = useState("");
  const [classUnits, setClassUnits] = useState<ClassUnitLite[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
    fetch("/api/class-units", { cache: "no-store" }).then((r) => r.json()).then((d) => { setClassUnits(d.classes || []); setActiveOrgId(d.orgId || null); }).catch(() => {});
  }, []);

  async function load() {
    const d = await fetch("/api/classes", { cache: "no-store" }).then((r) => r.json());
    setClasses(d.classes || []);
  }
  const selectedClassUnit = classUnits.find((c) => c.id === classUnitId) || null;

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

  const available = useMemo(() => {
    const base = MODULES.map((m) => ({ slug: m.slug, name: m.name, tag: "" }));
    const rp = roleplayModules.map((m) => ({ slug: m.slug, name: m.name, tag: "role-play" }));
    const iv = interviewModules.map((m) => ({ slug: m.slug, name: m.name, tag: "custom" }));
    return [...base, ...rp, ...iv].filter((m) => !order.includes(m.slug));
  }, [order, roleplayModules, interviewModules]);

  function edit(k: Klass) {
    setName(k.name);
    setCode(k.code);
    setOrgId(k.org_id || "");
    setLanguage(k.language || "English");
    setKind((k.kind as any) || "teaching");
    setEmails(((k.allowed_emails as any) || []).join("\n"));
    setOrder(k.modules || []);
    setClassUnitId(k.class_unit_id || "");
    setErr(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Clone a cohort's setup into the new-cohort form (fresh code, empty data).
  // Saving creates a new cohort; nobody's carried over, no results copied.
  function duplicate(k: Klass) {
    setName(`${k.name} (copy)`);
    setCode("");
    setOrgId(k.org_id || "");
    setLanguage(k.language || "English");
    setKind((k.kind as any) || "teaching");
    setEmails(((k.allowed_emails as any) || []).join("\n"));
    setOrder(k.modules || []);
    setClassUnitId(k.class_unit_id || "");
    setErr(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setName("");
    setCode("");
    setOrgId(defaultOrgId);
    setLanguage("English");
    setKind("teaching");
    setEmails("");
    setOrder([]);
    setClassUnitId("");
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

  async function adopt(k: Klass) {
    const ans = prompt(
      `Pull "${k.name}"'s runs into the cohort.\n\nPaired runs (both partners are members) always come in. Solo runs weren't stamped with an org, so to include members' individual runs enter how many days back the class was (e.g. 3). Leave 0 for paired only.`,
      "0"
    );
    if (ans === null) return;
    const sinceDays = Math.max(0, parseInt(ans, 10) || 0);
    const res = await fetch("/api/classes/adopt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: k.code, sinceDays }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) alert(`Pulled in ${d.adopted ?? 0} session${d.adopted === 1 ? "" : "s"}.`);
    else alert(d.error || "Couldn't pull those in.");
  }

  async function resetTags(k: Klass) {
    if (!confirm(`Un-group ALL sessions currently in "${k.name}"? Use this to undo an over-broad pull. Sessions go back to un-grouped; nothing is deleted.`)) return;
    const res = await fetch("/api/classes/adopt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: k.code, reset: true }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) alert(`Reset ${d.reset ?? 0} session${d.reset === 1 ? "" : "s"} to un-grouped.`);
    else alert(d.error || "Couldn't reset.");
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
        org_id: orgId,
        class_unit_id: (orgId && orgId === activeOrgId) ? classUnitId : "",
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
        <div className="mt-4 grid gap-4 sm:grid-cols-2" data-tour="cohort-basics">
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

        {orgs.length > 0 && (
          <div className="mt-4">
            <label className="lbl">Organization</label>
            <select className="field" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
              <option value="">Personal (no organization)</option>
            </select>
            <div className="mt-1 text-xs text-slate2">Which organization this cohort belongs to. Its results show under that org.</div>
          </div>
        )}

        {orgId && orgId === activeOrgId && (
          <div className="mt-4">
            <label className="lbl">Class</label>
            <select className="field" value={classUnitId} onChange={(e) => setClassUnitId(e.target.value)}>
              <option value="">No class</option>
              {classUnits.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="mt-1 text-xs text-slate2">
              The department or course this cohort is a section of. It inherits the class&apos;s modules.{" "}
              <Link href="/facilitator/classes" className="text-ai hover:underline">Manage classes</Link>
            </div>
            {selectedClassUnit && selectedClassUnit.modules.length > 0 && (
              <div className="mt-2 rounded-lg bg-sage-soft px-3 py-2 text-xs text-sage">Inherited from {selectedClassUnit.name}: {selectedClassUnit.modules.map(nameOf).join(", ")}. Anything you add below is on top of these.</div>
            )}
          </div>
        )}

        {/* Cohort type */}
        <div className="mt-4" data-tour="cohort-type">
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
        <div className="mt-5" data-tour="cohort-modules">
          <label className="lbl">Modules: in the order participants will do them</label>
          {order.length === 0 ? (
            <p className="text-sm text-slate2">Add modules below; drag order with the arrows.</p>
          ) : (
            <ol className="space-y-2">
              {order.map((slug, i) => (
                <li key={slug} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
                  <span className="w-5 text-right text-sm font-semibold text-slate2">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-ink">{nameOf(slug)}{isRoleplay(slug) && <span className="ml-1 rounded-full bg-amber-soft px-1.5 py-0.5 text-[10px] font-semibold text-amber">role-play</span>}{isCustom(slug) && <span className="ml-1 rounded-full bg-amber-soft px-1.5 py-0.5 text-[10px] font-semibold text-amber">custom</span>}</span>
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
                    + {m.name}{m.tag && <span className="ml-1 rounded-full bg-amber-soft px-1.5 py-0.5 text-[10px] font-semibold text-amber">{m.tag}</span>}
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

      <div data-tour="cohort-list">
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
                    <button onClick={() => duplicate(c)} className="btn-ghost text-sm" title="Make a new empty cohort with the same modules and settings">
                      Duplicate
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
                    <button onClick={() => adopt(c)} className="btn-ghost text-sm" title="Roll members' un-grouped sessions into this cohort">
                      Pull in sessions
                    </button>
                    <button onClick={() => resetTags(c)} className="text-sm text-clay hover:underline" title="Un-group all sessions in this cohort (undo a pull)">
                      Reset tags
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
