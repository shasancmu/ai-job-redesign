"use client";

import { useState } from "react";
import Link from "next/link";
import type { OrgAd, AdStats } from "@/lib/ads";

type Draft = Partial<OrgAd>;
const EMPTY: Draft = { emoji: "📣", title: "", tagline: "", body: "", image_url: "", cta_label: "", cta_url: "", status: "draft" };

export default function AdsAdmin({ orgId, initialAds, stats, interested }: {
  orgId: string;
  initialAds: OrgAd[];
  stats: Record<string, AdStats>;
  interested: Record<string, { name: string; at: string }[]>;
}) {
  const [ads, setAds] = useState<OrgAd[]>(initialAds);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function openNew() { setErr(""); setEditing({ ...EMPTY }); }
  function openEdit(ad: OrgAd) { setErr(""); setEditing({ ...ad }); }

  async function save(status: "draft" | "published") {
    if (!editing) return;
    if (!editing.title?.trim()) { setErr("A title is required."); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/ads/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, ...editing, status }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't save."); setBusy(false); return; }
      const saved = j.ad as OrgAd;
      setAds((prev) => { const i = prev.findIndex((a) => a.id === saved.id); if (i >= 0) { const n = [...prev]; n[i] = saved; return n; } return [saved, ...prev]; });
      setEditing(null);
    } catch { setErr("Couldn't reach the server."); }
    setBusy(false);
  }

  async function togglePublish(ad: OrgAd) {
    setBusy(true);
    try {
      const status = ad.status === "published" ? "draft" : "published";
      const res = await fetch("/api/ads/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId, id: ad.id, title: ad.title, emoji: ad.emoji, tagline: ad.tagline, body: ad.body, image_url: ad.image_url, cta_label: ad.cta_label, cta_url: ad.cta_url, status }) });
      const j = await res.json();
      if (res.ok) setAds((prev) => prev.map((a) => (a.id === ad.id ? (j.ad as OrgAd) : a)));
    } catch { /* ignore */ }
    setBusy(false);
  }

  const set = (p: Draft) => setEditing((e) => ({ ...(e || {}), ...p }));

  return (
    <div>
      {!editing && (
        <button onClick={openNew} className="btn-primary mt-4 text-sm">+ New spotlight</button>
      )}

      {editing && (
        <div className="card mt-4 space-y-4 p-5">
          <div className="flex gap-3">
            <div className="w-20">
              <label className="lbl">Icon</label>
              <input className="field mt-1 text-center text-xl" value={editing.emoji || ""} onChange={(e) => set({ emoji: e.target.value.slice(0, 2) })} placeholder="📣" />
            </div>
            <div className="flex-1">
              <label className="lbl">Title</label>
              <input className="field mt-1" value={editing.title || ""} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Applied AI Strategy: Fall cohort" />
            </div>
          </div>
          <div>
            <label className="lbl">Card subtitle</label>
            <input className="field mt-1 text-sm" value={editing.tagline || ""} onChange={(e) => set({ tagline: e.target.value })} placeholder="One line shown on the card, e.g. A 6-week executive program. Apply by Oct 15." />
          </div>
          <div>
            <label className="lbl">Landing page</label>
            <textarea className="field mt-1 min-h-[140px] text-sm" value={editing.body || ""} onChange={(e) => set({ body: e.target.value })} placeholder="The details a member sees when they open it: what it is, who it's for, dates, what they'll get." />
          </div>
          <div>
            <label className="lbl">Hero image URL <span className="font-normal text-slate-400">(optional)</span></label>
            <input className="field mt-1 text-sm" value={editing.image_url || ""} onChange={(e) => set({ image_url: e.target.value })} placeholder="https://…" />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1">
              <label className="lbl">Button label</label>
              <input className="field mt-1 text-sm" value={editing.cta_label || ""} onChange={(e) => set({ cta_label: e.target.value })} placeholder="Register" />
            </div>
            <div className="flex-[2]">
              <label className="lbl">Button link <span className="font-normal text-slate-400">(where it opens)</span></label>
              <input className="field mt-1 text-sm" value={editing.cta_url || ""} onChange={(e) => set({ cta_url: e.target.value })} placeholder="https://…" />
            </div>
          </div>
          {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => save("published")} disabled={busy} className="btn-primary text-sm">{busy ? "Saving…" : "Publish"}</button>
            <button onClick={() => save("draft")} disabled={busy} className="btn-ghost text-sm">Save as draft</button>
            <button onClick={() => setEditing(null)} className="text-sm text-slate-400 hover:text-ink">Cancel</button>
          </div>
        </div>
      )}

      {ads.length === 0 && !editing ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-mist/30 p-10 text-center">
          <div className="text-3xl">📣</div>
          <p className="mt-2 font-serif text-lg text-ink">No spotlights yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Create one to promote a program or event to your members. It shows up as a card in their catalog and links to a page here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {ads.map((ad) => {
            const s = stats[ad.id] || { impressions: 0, clicks: 0, cta: 0, interest: 0, reach: 0, ctr: 0 };
            const who = interested[ad.id] || [];
            return (
              <div key={ad.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="text-2xl" aria-hidden>{ad.emoji || "📣"}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">{ad.title}</span>
                        <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + (ad.status === "published" ? "bg-sage-soft text-sage" : "bg-amber-soft text-amber")}>{ad.status}</span>
                      </div>
                      {ad.tagline && <div className="mt-0.5 text-sm text-slate-500">{ad.tagline}</div>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm">
                    <button onClick={() => openEdit(ad)} className="text-slate2 hover:text-ink">Edit</button>
                    <Link href={`/promo/${ad.slug}`} target="_blank" className="text-slate2 hover:text-ink">Preview →</Link>
                    <button onClick={() => togglePublish(ad)} disabled={busy} className="font-medium text-ai hover:underline">{ad.status === "published" ? "Unpublish" : "Publish"}</button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 border-t border-line pt-3 text-center">
                  <Stat n={s.impressions} label="Impressions" />
                  <Stat n={s.clicks} label="Clicks" />
                  <Stat n={s.ctr} label="CTR %" />
                  <Stat n={s.interest} label="Interested" />
                </div>

                {who.length > 0 && (
                  <div className="mt-3 rounded-xl bg-mist/50 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Interested</div>
                    <div className="mt-1 text-sm text-slate-600">{who.map((w) => w.name).join(" · ")}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="text-xl font-bold tabular-nums text-ink">{n}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
