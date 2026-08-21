"use client";

import { useState } from "react";

// Your-data controls: export everything (portability) and delete the account
// and all its data (erasure). Deletion requires typing DELETE to confirm.
export default function AccountPrivacy() {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function del() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || "Couldn't delete the account."); setBusy(false); return; }
      window.location.href = "/?deleted=1";
    } catch { setErr("Couldn't delete the account."); setBusy(false); }
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-ink">Your data &amp; privacy</h2>

      <div className="mt-3 space-y-3">
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="font-medium text-ink">Export your data</div>
            <div className="text-sm text-slate2">Download everything we hold about you as a JSON file.</div>
          </div>
          <a href="/api/account/export" className="btn-ghost text-sm">Download</a>
        </div>

        <div className="card p-4" style={{ borderColor: "var(--clay, #C06A47)" }}>
          <div className="font-medium text-clay">Delete your account</div>
          <div className="mt-0.5 text-sm text-slate2">
            Permanently erases your account, your exercises and reports, and any cohorts or live sessions you created. This can&apos;t be undone.
          </div>
          {!confirming ? (
            <button onClick={() => setConfirming(true)} className="mt-3 rounded-full border border-clay px-4 py-2 text-sm font-medium text-clay transition hover:bg-clay-soft">Delete my account</button>
          ) : (
            <div className="mt-3">
              <label className="text-sm text-slate-600">Type <b>DELETE</b> to confirm:</label>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <input className="field" style={{ maxWidth: 200 }} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" />
                <button onClick={del} disabled={busy || typed !== "DELETE"} className="rounded-full bg-clay px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">{busy ? "Deleting…" : "Permanently delete"}</button>
                <button onClick={() => { setConfirming(false); setTyped(""); setErr(null); }} className="btn-ghost text-sm">Cancel</button>
              </div>
              {err && <p className="mt-2 text-sm text-clay">{err}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
