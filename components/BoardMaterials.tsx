"use client";

import { useRef, useState } from "react";

export type Material = { id: string; kind: "note" | "link" | "file"; label: string; text: string };

const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|log|rtf)$/i;

export default function BoardMaterials({
  materials,
  onChange,
}: {
  materials: Material[];
  onChange: (next: Material[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<null | "note" | "link">(null);
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const add = (m: Material) => onChange([...materials, m]);
  const remove = (id: string) => onChange(materials.filter((m) => m.id !== id));
  const nid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  function addNote() {
    const t = note.trim();
    if (!t) return;
    add({ id: nid(), kind: "note", label: "Note: " + t.slice(0, 40) + (t.length > 40 ? "…" : ""), text: t });
    setNote("");
    setMode(null);
  }

  async function addLink() {
    const url = link.trim();
    if (!url) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/board", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "ingest", kind: "link", url }) });
      const d = await res.json();
      if (!res.ok) setErr(d.error || "Couldn't read that link.");
      else {
        add({ id: nid(), kind: "link", label: d.label || url, text: d.text });
        setLink("");
        setMode(null);
      }
    } catch {
      setErr("Couldn't read that link.");
    }
    setBusy(false);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      if (file.type.startsWith("text/") || TEXT_EXT.test(file.name)) {
        const text = (await file.text()).slice(0, 12000);
        add({ id: nid(), kind: "file", label: file.name, text });
      } else if (file.type.startsWith("image/")) {
        const image = await downscale(file, 1600, 0.85);
        const d = await ingest({ kind: "image", image, filename: file.name });
        add({ id: nid(), kind: "file", label: d.label || file.name, text: d.text });
      } else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        if (file.size > 6_000_000) throw new Error("That PDF is too large. Try a smaller one or paste the text.");
        const data = (await readDataUrl(file)).split(",")[1] || "";
        const d = await ingest({ kind: "pdf", data, filename: file.name });
        add({ id: nid(), kind: "file", label: file.name, text: d.text });
      } else {
        throw new Error("Unsupported file. Use a PDF, a text file, or a photo of the page.");
      }
    } catch (e: any) {
      setErr(e?.message || "Couldn't read that file.");
    }
    setBusy(false);
  }

  async function ingest(payload: any): Promise<{ label: string; text: string }> {
    const res = await fetch("/api/board", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "ingest", ...payload }) });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Couldn't read that.");
    return d;
  }

  const KIND_ICON: Record<string, string> = { note: "📝", link: "🔗", file: "📎" };

  return (
    <div>
      {materials.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {materials.map((m) => (
            <span key={m.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink">
              <span>{KIND_ICON[m.kind]}</span>
              <span className="max-w-[220px] truncate">{m.label}</span>
              <button onClick={() => remove(m.id)} className="text-slate-300 hover:text-clay">✕</button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setMode(mode === "note" ? null : "note")} className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-slate2 hover:text-ink">📝 Paste text</button>
        <button type="button" onClick={() => setMode(mode === "link" ? null : "link")} className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-slate2 hover:text-ink">🔗 Add link</button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-slate2 hover:text-ink">📎 Upload file</button>
        {busy && <span className="text-xs text-slate-400">Reading…</span>}
        <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.csv,.tsv,.json,image/*" onChange={onFile} className="hidden" />
      </div>

      {mode === "note" && (
        <div className="mt-2 flex items-start gap-2">
          <textarea className="field min-h-[64px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Paste numbers, an email, notes… anything the board should know." />
          <button type="button" onClick={addNote} disabled={!note.trim()} className="btn-primary text-sm">Add</button>
        </div>
      )}
      {mode === "link" && (
        <div className="mt-2 flex items-center gap-2">
          <input className="field" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
          <button type="button" onClick={addLink} disabled={busy || !link.trim()} className="btn-primary text-sm">{busy ? "Reading…" : "Add"}</button>
        </div>
      )}
      {err && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
    </div>
  );
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

function downscale(file: File, max: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}
