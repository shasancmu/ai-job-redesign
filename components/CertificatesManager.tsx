"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MODULES } from "@/lib/modules";

const PICKABLE = MODULES.filter((m) => !m.hidden && m.partner !== "group");
const nameOf = (slug: string) => MODULES.find((m) => m.slug === slug)?.name || slug;

type Row = {
  id: string;
  name: string;
  line: string | null;
  core: string[];
  electives: string[];
  electives_needed: number;
  skills: string[];
  active: boolean;
};

export default function CertificatesManager({
  scope,
  orgId,
  bundles,
}: {
  scope: "global" | "org";
  orgId?: string;
  bundles: Row[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const endpoint = scope === "global" ? "/api/admin/certificates" : "/api/team/certificates";

  async function post(body: any) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scope === "org" ? { ...body, orgId } : body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || "Failed");
    return d;
  }

  return (
    <div className="space-y-4">
      {!creating ? (
        <button onClick={() => setCreating(true)} className="btn-primary text-sm">+ New certificate</button>
      ) : (
        <BundleForm post={post} onDone={() => { setCreating(false); router.refresh(); }} onCancel={() => setCreating(false)} />
      )}

      {bundles.length === 0 && !creating && (
        <p className="text-sm text-slate-400">No certificates yet. Create one from a set of modules.</p>
      )}

      {bundles.map((b) => (
        <BundleCard key={b.id} row={b} post={post} onChanged={() => router.refresh()} />
      ))}
    </div>
  );
}

function BundleForm({ row, post, onDone, onCancel }: { row?: Row; post: (b: any) => Promise<any>; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(row?.name || "");
  const [line, setLine] = useState(row?.line || "");
  const [skills, setSkills] = useState((row?.skills || []).join(", "));
  const [core, setCore] = useState<Set<string>>(new Set(row?.core || []));
  const [electives, setElectives] = useState<Set<string>>(new Set(row?.electives || []));
  const [need, setNeed] = useState<number>(row?.electives_needed ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // A module is in at most one set.
  const toggleCore = (slug: string) =>
    setCore((s) => { const n = new Set(s); if (n.has(slug)) n.delete(slug); else { n.add(slug); setElectives((e) => { const x = new Set(e); x.delete(slug); return x; }); } return n; });
  const toggleElective = (slug: string) =>
    setElectives((s) => { const n = new Set(s); if (n.has(slug)) n.delete(slug); else { n.add(slug); setCore((c) => { const x = new Set(c); x.delete(slug); return x; }); } return n; });

  const needClamped = Math.max(0, Math.min(electives.size, need));

  async function save() {
    setBusy(true); setErr(null);
    try {
      await post({
        action: "save",
        id: row?.id,
        name,
        line,
        core: [...core],
        electives: [...electives],
        electivesNeeded: needClamped,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="lbl">Certificate name</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Applied AI Strategy" />
        </div>
        <div>
          <label className="lbl">Skills <span className="font-normal text-slate-400">(comma-separated)</span></label>
          <input className="field" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="AI Strategy, Leadership" />
        </div>
      </div>
      <div>
        <label className="lbl">One-line description</label>
        <input className="field" value={line} onChange={(e) => setLine(e.target.value)} placeholder="What finishing this bundle demonstrates." />
      </div>

      <ModulePicker label="Core modules" hint="All required to earn the certificate." selected={core} otherSet={electives} onToggle={toggleCore} />

      <div>
        <ModulePicker label="Elective modules" hint="Optional pool to choose from." selected={electives} otherSet={core} onToggle={toggleElective} />
        {electives.size > 0 && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-slate-500">Require</span>
            <input type="number" min={0} max={electives.size} value={needClamped}
              onChange={(e) => setNeed(parseInt(e.target.value, 10) || 0)} className="field w-20" />
            <span className="text-slate-500">of {electives.size} elective{electives.size === 1 ? "" : "s"}.</span>
          </div>
        )}
      </div>

      {err && <p className="text-sm text-clay">{err}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy || !name.trim() || core.size + electives.size === 0} className="btn-primary text-sm">
          {busy ? "Saving…" : row ? "Save" : "Create"}
        </button>
        <button onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
      </div>
    </div>
  );
}

function ModulePicker({ label, hint, selected, otherSet, onToggle }: { label: string; hint: string; selected: Set<string>; otherSet: Set<string>; onToggle: (slug: string) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="lbl mb-0">{label}</label>
        <span className="text-xs text-slate-400">{selected.size} selected</span>
      </div>
      <div className="mb-1.5 text-xs text-slate-400">{hint}</div>
      <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-line p-2">
        {PICKABLE.map((m) => {
          const inOther = otherSet.has(m.slug);
          const on = selected.has(m.slug);
          return (
            <button
              key={m.slug}
              type="button"
              onClick={() => onToggle(m.slug)}
              className={
                "rounded-full px-2.5 py-1 text-xs font-medium transition " +
                (on ? "bg-ink text-white" : inOther ? "bg-mist text-slate-300" : "bg-mist text-slate2 hover:bg-slate-200")
              }
              title={inOther ? "Already in the other set" : ""}
            >
              {m.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BundleCard({ row, post, onChanged }: { row: Row; post: (b: any) => Promise<any>; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function del() {
    if (!confirm(`Delete the "${row.name}" certificate? People who already earned it keep their record, but it stops being awarded.`)) return;
    setBusy(true); setErr(null);
    try { await post({ action: "delete", id: row.id }); onChanged(); } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  if (editing) return <BundleForm row={row} post={post} onDone={() => { setEditing(false); onChanged(); }} onCancel={() => setEditing(false)} />;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-bold text-ink">{row.name}</div>
          {row.line && <div className="text-sm text-slate-500">{row.line}</div>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="btn-ghost text-sm">Edit</button>
          <button onClick={del} disabled={busy} className="text-sm text-slate-400 hover:text-clay">Delete</button>
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-500">
        <span className="font-semibold text-ink">Core:</span> {row.core.map(nameOf).join(", ") || "none"}
      </div>
      {row.electives.length > 0 && (
        <div className="mt-1 text-xs text-slate-500">
          <span className="font-semibold text-ink">Electives (choose {row.electives_needed}):</span> {row.electives.map(nameOf).join(", ")}
        </div>
      )}
      {row.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {row.skills.map((s) => <span key={s} className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-slate2">{s}</span>)}
        </div>
      )}
      {err && <p className="mt-2 text-sm text-clay">{err}</p>}
    </div>
  );
}
