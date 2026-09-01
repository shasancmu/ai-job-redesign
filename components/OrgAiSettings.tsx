"use client";

import { useEffect, useState } from "react";

type Status = { enabled: boolean; configured: boolean; base_url: string | null; model: string | null; low_model: string | null; has_key: boolean; updated_at: string | null };

// Director-only: point this org at its OWN private AI models + key, so student
// data routes to that endpoint instead of the shared platform model (e.g. a
// university's FERPA-compliant, self-hosted models). The key is write-only —
// it's never sent back to the browser.
export default function OrgAiSettings({ orgId }: { orgId: string }) {
  const [st, setSt] = useState<Status | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [lowModel, setLowModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);
  async function load() {
    try {
      const d = await fetch(`/api/org/ai?org=${encodeURIComponent(orgId)}`, { cache: "no-store" }).then((r) => r.json());
      if (d?.status) { const s = d.status as Status; setSt(s); setBaseUrl(s.base_url || ""); setModel(s.model || ""); setLowModel(s.low_model || ""); setEnabled(s.enabled); setApiKey(""); }
    } catch { /* ignore */ }
  }

  async function post(action: "save" | "test") {
    setBusy(true); setMsg(""); setErr("");
    try {
      const d = await fetch("/api/org/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId, action: action === "save" ? undefined : "test", base_url: baseUrl.trim(), model: model.trim(), low_model: lowModel.trim(), api_key: apiKey, enabled }) }).then((r) => r.json());
      if (action === "test") { d?.ok ? setMsg(`Reached it — the endpoint replied “${d.reply || "OK"}”.`) : setErr(d?.error || "Couldn't reach the endpoint."); }
      else { if (d?.status) { setSt(d.status); setApiKey(""); setMsg("Saved."); } else setErr(d?.error || "Couldn't save."); }
    } catch { setErr("Something went wrong."); }
    setBusy(false);
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-ink">Your AI provider (private models)</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate2">
        Route this organization&apos;s AI to your <b>own models and key</b> — e.g. a self-hosted, private endpoint — so student data reaches your models, not the shared one. When it&apos;s on, this org&apos;s AI runs on your endpoint (no fallback to the platform model). Works with any OpenAI-compatible or Anthropic endpoint.
      </p>

      {st && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className={"rounded-full px-2 py-0.5 font-semibold " + (st.enabled && st.configured ? "bg-emerald-50 text-emerald-700" : st.configured ? "bg-amber-50 text-amber-700" : "bg-mist text-slate-500")}>
            {st.enabled && st.configured ? "On · using your models" : st.configured ? "Configured · off" : "Not set up"}
          </span>
          {st.has_key && <span className="text-slate-400">a key is stored</span>}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <label className="lbl">Base URL</label>
          <input className="field font-mono text-[13px]" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://ai.your-school.edu/v1" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="lbl">Model</label><input className="field font-mono text-[13px]" value={model} onChange={(e) => setModel(e.target.value)} placeholder="llama-3.3-70b" /></div>
          <div><label className="lbl">Fast model <span className="font-normal text-slate-400">(optional)</span></label><input className="field font-mono text-[13px]" value={lowModel} onChange={(e) => setLowModel(e.target.value)} placeholder="falls back to Model" /></div>
        </div>
        <div>
          <label className="lbl">API key {st?.has_key && <span className="font-normal text-slate-400">· leave blank to keep the stored key</span>}</label>
          <input className="field font-mono text-[13px]" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={st?.has_key ? "•••••••• (unchanged)" : "sk-…"} autoComplete="off" />
          <p className="mt-1 text-xs text-slate-400">Stored server-side and never shown again.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Use my models for this organization
        </label>
      </div>

      {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}

      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => post("save")} disabled={busy} className="btn-primary text-sm">{busy ? "…" : "Save"}</button>
        <button onClick={() => post("test")} disabled={busy || !baseUrl.trim() || !model.trim()} className="btn-ghost text-sm">Test connection</button>
      </div>
    </section>
  );
}
