"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Rule = { id: string; trigger: string; kind: string; title: string; body: string | null; href: string | null; enabled: boolean };

const TRIGGERS = [
  { key: "reengage", label: "goes cooling or at-risk" },
  { key: "cooling", label: "goes cooling" },
  { key: "at_risk", label: "goes at-risk" },
  { key: "isolated", label: "has no peer ties" },
];
const KINDS = [
  { key: "module", label: "Module drop" },
  { key: "offer", label: "Offer" },
  { key: "event", label: "Event" },
  { key: "update", label: "Update" },
];

async function post(body: any) {
  const res = await fetch("/api/team/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json().then((d) => ({ ok: res.ok, ...d }));
}

// Set-and-forget rules: when a member enters a state, auto-drip value. The
// relationship maintains itself at fixed cost — no hand-sending.
export default function AutomationsPanel({ rules }: { rules: Rule[] }) {
  const [adding, setAdding] = useState(false);
  const [trigger, setTrigger] = useState("reengage");
  const [kind, setKind] = useState("module");
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [href, setHref] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function create() {
    setErr(null); setBusy(true);
    const r = await post({ action: "create", trigger, kind, title, body: bodyText, href });
    setBusy(false);
    if (!r.ok) { setErr(r.error || "Couldn't save."); return; }
    setTitle(""); setBodyText(""); setHref(""); setAdding(false);
    router.refresh();
  }
  async function toggle(id: string, enabled: boolean) { await post({ action: "toggle", id, enabled }); router.refresh(); }
  async function remove(id: string) { await post({ action: "delete", id }); router.refresh(); }

  return (
    <div>
      {rules.length > 0 && (
        <div className="mb-3 space-y-2">
          {rules.map((r) => {
            const trig = TRIGGERS.find((t) => t.key === r.trigger)?.label || r.trigger;
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 text-sm">
                <span className={"h-2 w-2 shrink-0 rounded-full " + (r.enabled ? "bg-sage" : "bg-slate-300")} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink">{r.title}</div>
                  <div className="truncate text-xs text-slate-400">When a member {trig} → send this {r.kind}</div>
                </div>
                <button onClick={() => toggle(r.id, !r.enabled)} className="shrink-0 text-xs font-semibold text-slate2 hover:text-ink">{r.enabled ? "Pause" : "Resume"}</button>
                <button onClick={() => remove(r.id)} className="shrink-0 text-xs text-slate-400 hover:text-clay">Delete</button>
              </div>
            );
          })}
        </div>
      )}

      {adding ? (
        <div className="rounded-2xl border-2 border-ink/10 bg-white p-4">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-sm text-slate2">
            <span>When a member</span>
            <select className="field w-auto py-1" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
              {TRIGGERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <span>send them a</span>
            <select className="field w-auto py-1" value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </div>
          <input className="field mb-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title — e.g. Been a while? Try the new negotiation sim" maxLength={160} />
          <textarea className="field mb-2 min-h-[54px]" value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder="A line of value (optional)." maxLength={1000} />
          <input className="field mb-3" value={href} onChange={(e) => setHref(e.target.value)} placeholder="/start/close-the-offer or a link" />
          <div className="flex items-center gap-3">
            <button onClick={create} disabled={busy || !title.trim()} className="btn-dark text-sm">{busy ? "Saving…" : "Turn on"}</button>
            <button onClick={() => setAdding(false)} className="text-sm text-slate-400 hover:text-ink">Cancel</button>
            {err && <span className="text-sm text-clay">{err}</span>}
          </div>
          <p className="mt-2 text-xs text-slate-400">Fires daily. A person won&apos;t be hit by the same rule twice within 30 days.</p>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="btn-ghost text-sm">+ New automation</button>
      )}
    </div>
  );
}
