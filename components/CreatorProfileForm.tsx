"use client";

import { useState } from "react";

// Your public teaching identity, shown on the modules you sign. Affiliation is
// verified from your organization membership; the field here is a fallback for when
// you don't belong to one.
export default function CreatorProfileForm({ initial }: { initial: { title?: string; institution?: string; bio?: string; avatar_url?: string; handle?: string } }) {
  const [title, setTitle] = useState(initial.title || "");
  const [institution, setInstitution] = useState(initial.institution || "");
  const [bio, setBio] = useState(initial.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url || "");
  const [handle, setHandle] = useState(initial.handle || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/creator/profile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, institution, bio, avatar_url: avatarUrl }),
      });
      const d = await res.json();
      if (res.ok) { if (d.handle) setHandle(d.handle); setMsg("Saved."); }
      else setMsg(d.error || "Couldn't save.");
    } catch { setMsg("Couldn't save."); }
    setSaving(false);
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mist text-sm font-semibold text-slate-400">🎓</div>
        )}
        <div className="flex-1">
          <label className="lbl">Photo URL</label>
          <input className="field" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…/headshot.jpg" />
        </div>
      </div>
      <div>
        <label className="lbl">Title</label>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Professor of Strategy" />
      </div>
      <div>
        <label className="lbl">Institution (fallback)</label>
        <input className="field" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Duke University" />
        <p className="mt-0.5 text-xs text-slate-400">When you belong to an organization, its name and logo are shown and marked verified. This is used only if you don&apos;t.</p>
      </div>
      <div>
        <label className="lbl">Short bio</label>
        <textarea className="field min-h-[90px]" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="One paragraph on what you teach and the judgment you bring to it." />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-40">{saving ? "Saving…" : "Save creator profile"}</button>
        {handle && <a href={`/by/${handle}`} className="text-sm font-semibold text-ai hover:underline">View your page →</a>}
        {msg && <span className="text-sm text-slate-500">{msg}</span>}
      </div>
    </form>
  );
}
