"use client";

import { useState } from "react";

type Highlight = { title: string; body: string };
type Faculty = { name: string; title?: string; image_url?: string };
export type BrandingOrg = {
  id: string; slug: string; name: string; tagline: string | null; primary_color: string | null;
  logo_url: string | null; hero_image_url: string | null; about: string | null;
  highlights: Highlight[] | null; faculty: Faculty[] | null;
};

// Shrink an image in the browser before upload so it never exceeds the serverless
// body limit. SVGs and already-small files pass through.
async function downscale(file: File, maxDim: number): Promise<Blob> {
  if (file.type === "image/svg+xml" || file.size < 250 * 1024) return file;
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    const isPng = file.type.includes("png");
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, isPng ? "image/png" : "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

async function uploadAsset(orgId: string, kind: "logo" | "hero" | "faculty", file: File): Promise<string> {
  const blob = await downscale(file, kind === "hero" ? 1800 : kind === "logo" ? 640 : 480);
  const fd = new FormData();
  fd.set("orgId", orgId); fd.set("kind", kind);
  fd.set("file", new File([blob], file.name, { type: blob.type || file.type }));
  const res = await fetch("/api/admin/orgs/asset", { method: "POST", body: fd });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Upload failed");
  return d.url as string;
}

export default function OrgBrandingEditor({ org }: { org: BrandingOrg }) {
  const [name, setName] = useState(org.name || "");
  const [tagline, setTagline] = useState(org.tagline || "");
  const [about, setAbout] = useState(org.about || "");
  const [color, setColor] = useState(org.primary_color || "#3f7a52");
  const [logo, setLogo] = useState(org.logo_url || "");
  const [hero, setHero] = useState(org.hero_image_url || "");
  const [highlights, setHighlights] = useState<Highlight[]>(org.highlights || []);
  const [faculty, setFaculty] = useState<Faculty[]>(org.faculty || []);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function pickImage(kind: "logo" | "hero", file: File) {
    setBusy(kind); setErr(null);
    try { const url = await uploadAsset(org.id, kind, file); kind === "logo" ? setLogo(url) : setHero(url); }
    catch (e: any) { setErr(e.message); }
    setBusy(null);
  }
  async function pickFacultyPhoto(i: number, file: File) {
    setBusy(`f${i}`); setErr(null);
    try { const url = await uploadAsset(org.id, "faculty", file); setFaculty((fs) => fs.map((f, k) => (k === i ? { ...f, image_url: url } : f))); }
    catch (e: any) { setErr(e.message); }
    setBusy(null);
  }

  async function save() {
    setBusy("save"); setErr(null); setSaved(false);
    try {
      const res = await fetch("/api/admin/orgs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_org", id: org.id, name: name.trim(), tagline, primary_color: color, about,
          highlights: highlights.filter((h) => h.title.trim() || h.body.trim()),
          faculty: faculty.filter((f) => f.name.trim()),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || "Couldn't save."); setBusy(null); return; }
      setSaved(true);
    } catch { setErr("Couldn't reach the service."); }
    setBusy(null);
  }

  const fileBtn = (label: string, onFile: (f: File) => void, loading: boolean) => (
    <label className="btn-ghost cursor-pointer text-sm">
      {loading ? "Uploading…" : label}
      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </label>
  );

  return (
    <div className="space-y-6">
      {/* Brand images */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink">Logo &amp; hero image</h2>
        <p className="mt-0.5 text-xs text-slate2">Shown on your organization's landing page. PNG keeps a transparent logo.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 text-xs font-medium text-slate2">Logo</div>
            <div className="flex h-16 items-center rounded-xl border border-line bg-mist px-3">
              {logo ? <img src={logo} alt="" className="h-9 max-w-[160px] object-contain" /> : <span className="h-7 w-7 rounded-full" style={{ background: color }} />}
            </div>
            <div className="mt-2">{fileBtn(logo ? "Replace logo" : "Upload logo", (f) => pickImage("logo", f), busy === "logo")}</div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium text-slate2">Hero image</div>
            <div className="h-16 overflow-hidden rounded-xl border border-line bg-mist">
              {hero ? <img src={hero} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">No hero image</div>}
            </div>
            <div className="mt-2">{fileBtn(hero ? "Replace hero" : "Upload hero", (f) => pickImage("hero", f), busy === "hero")}</div>
          </div>
        </div>
      </section>

      {/* Text */}
      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold text-ink">Details</h2>
        <div>
          <label className="lbl">Name</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your organization" />
        </div>
        <div>
          <label className="lbl">Tagline</label>
          <input className="field" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="AI for your leaders and teams" />
        </div>
        <div>
          <label className="lbl">About</label>
          <textarea className="field min-h-[80px]" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="A private Superadditive workspace for your teams — hands-on exercises for the decisions they actually face." />
        </div>
        <div>
          <label className="lbl">Primary color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#3f7a52"} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-line bg-white" />
            <input className="field max-w-[140px]" value={color} onChange={(e) => setColor(e.target.value)} placeholder="#3f7a52" />
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Highlights</h2>
          <button type="button" onClick={() => setHighlights((h) => [...h, { title: "", body: "" }])} className="text-sm text-sky hover:underline">+ Add</button>
        </div>
        {highlights.length === 0 && <p className="mt-1 text-xs text-slate-400">Empty = tasteful placeholder cards show on the page.</p>}
        <div className="mt-3 space-y-3">
          {highlights.map((h, i) => (
            <div key={i} className="rounded-xl border border-line p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input className="field" value={h.title} onChange={(e) => setHighlights((hs) => hs.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} placeholder="Heading" />
                  <textarea className="field min-h-[52px]" value={h.body} onChange={(e) => setHighlights((hs) => hs.map((x, k) => (k === i ? { ...x, body: e.target.value } : x)))} placeholder="One or two lines." />
                </div>
                <button type="button" onClick={() => setHighlights((hs) => hs.filter((_, k) => k !== i))} className="text-slate-400 hover:text-clay" aria-label="Remove">✕</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Faculty */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Key people</h2>
          <button type="button" onClick={() => setFaculty((f) => [...f, { name: "" }])} className="text-sm text-sky hover:underline">+ Add</button>
        </div>
        {faculty.length === 0 && <p className="mt-1 text-xs text-slate-400">Empty = placeholder circles show on the page.</p>}
        <div className="mt-3 space-y-3">
          {faculty.map((f, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-line p-3">
              <div className="shrink-0">
                {f.image_url ? <img src={f.image_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-mist" />}
                <label className="mt-1 block cursor-pointer text-center text-[11px] text-sky hover:underline">
                  {busy === `f${i}` ? "…" : "Photo"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickFacultyPhoto(i, e.target.files[0])} />
                </label>
              </div>
              <div className="flex-1 space-y-2">
                <input className="field" value={f.name} onChange={(e) => setFaculty((fs) => fs.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} placeholder="Name" />
                <input className="field" value={f.title || ""} onChange={(e) => setFaculty((fs) => fs.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} placeholder="Title / role" />
              </div>
              <button type="button" onClick={() => setFaculty((fs) => fs.filter((_, k) => k !== i))} className="text-slate-400 hover:text-clay" aria-label="Remove">✕</button>
            </div>
          ))}
        </div>
      </section>

      {err && <p className="text-sm text-clay">{err}</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy === "save" || !name.trim()} className="btn-primary disabled:opacity-40">{busy === "save" ? "Saving…" : "Save changes"}</button>
        <a href={`/${org.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-sky hover:underline">Preview page ↗</a>
        {saved && <span className="text-sm text-sage">Saved.</span>}
      </div>
    </div>
  );
}
