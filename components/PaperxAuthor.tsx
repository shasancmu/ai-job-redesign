"use client";

// Paper Explainer authoring, in the studio: upload an academic paper (or paste
// its text), the studio deconstructs it into an interactive, visual explainer
// built to leave a reader able to teach the idea — then hands it to the editor
// to verify and publish.

import { useRef, useState } from "react";
import PaperxEditor from "@/components/PaperxEditor";
import type { PxGenome } from "@/lib/paperx/types";

export default function PaperxAuthor() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [pdfB64, setPdfB64] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [genome, setGenome] = useState<PxGenome | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(f: File | null) {
    if (!f) return;
    setErr(null);
    if (f.size > 15 * 1024 * 1024) { setErr("That PDF is over 15MB. Try a smaller file or paste the text."); return; }
    const buf = await f.arrayBuffer();
    let bin = ""; const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    setPdfB64(btoa(bin));
    setFileName(f.name);
    setText("");
  }

  async function generate() {
    if (!pdfB64 && text.trim().length < 400) { setErr("Upload the paper's PDF, or paste at least a few paragraphs of it."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/paperx/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pdfB64 ? { pdf: pdfB64 } : { text }) });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Couldn't generate."); setBusy(false); return; }
      setGenome(j.genome);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 60);
    } catch { setErr("Couldn't reach the generator."); }
    setBusy(false);
  }

  if (genome) {
    return (
      <main className="min-h-screen bg-paper text-ink">
        <div className="mx-auto max-w-3xl px-5 pt-6">
          <button onClick={() => setGenome(null)} className="text-sm text-slate2 hover:text-ink">← Start from a different paper</button>
        </div>
        <div className="mt-3"><PaperxEditor spec={genome} /></div>
      </main>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Upload the paper</div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm">{fileName ? `📄 ${fileName}` : "Choose a PDF…"}</button>
          {fileName && <button onClick={() => { setPdfB64(""); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }} className="text-xs text-slate-400 hover:text-ink">clear</button>}
          <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={(e) => onFile(e.target.files?.[0] || null)} />
        </div>
        <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Or paste the text</div>
        <textarea value={text} onChange={(e) => { setText(e.target.value); if (e.target.value) { setPdfB64(""); setFileName(""); } }} rows={5} placeholder="Paste the abstract + key sections, or the whole paper…" className="field mt-2 w-full text-sm" />
        {err && <p className="mt-3 text-sm text-clay">{err}</p>}
        <button onClick={generate} disabled={busy} className="btn-primary mt-4">{busy ? "Building your explainer… (up to a minute)" : "Build the explainer →"}</button>
        <p className="mt-2 text-xs text-slate-400">The AI is instructed to use only the paper's real numbers and findings. You verify everything before publishing.</p>
      </div>
    </div>
  );
}
