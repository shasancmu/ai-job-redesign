"use client";

import { useRef, useState } from "react";

type Result = { kind: "photo" | "text"; title: string; description: string; transcript: string };

// PUBLIC, no sign-in. Take/choose a photo, downscale it in the browser, send it
// for analysis, and show what the AI read back. The image never leaves as more
// than a transient upload; only the text is kept.
export default function PhotoCapture({ code, prompt, showPhotos = false }: { code: string; prompt: string; showPhotos?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setErr(null);
    try {
      // Gallery keeps the thumbnail, so encode a bit smaller to stay light.
      const dataUrl = showPhotos ? await downscale(file, 900, 0.72) : await downscale(file, 1280, 0.85);
      setPreview(dataUrl);
      setResult(null);
    } catch {
      setErr("Couldn't read that image. Try another.");
    }
  }

  async function submit() {
    if (!preview || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/photo/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, image: preview, ...(showPhotos ? { caption: caption.trim() } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setErr(data.error || "Couldn't send. Try again.");
      else {
        setResult({ kind: data.kind, title: data.title, description: data.description, transcript: data.transcript });
        setPreview(null);
        setCaption("");
      }
    } catch {
      setErr("Couldn't send. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-7">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">The prompt</div>
      <h1 className="mt-1 text-xl font-bold leading-snug text-ink">{prompt || "Take a photo to add to the wall"}</h1>

      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />

      {/* Result state */}
      {result ? (
        <div className="mt-5">
          <div className="rounded-2xl bg-sage-soft p-4">
            <div className="text-sm font-semibold text-sage">✓ Added to the wall</div>
            <div className="mt-2 font-bold text-ink">{result.title}</div>
            {result.kind === "text" && result.transcript ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{result.transcript}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-700">{result.description}</p>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            {showPhotos ? "Your photo is now on the shared screen." : "Your photo was analyzed by AI and not stored, only this text was kept."}
          </p>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost mt-4 w-full">Add another photo</button>
        </div>
      ) : preview ? (
        <div className="mt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your photo" className="max-h-72 w-full rounded-2xl object-cover" />
          {showPhotos && !busy && (
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption (optional)"
              maxLength={140}
              className="field mt-3"
            />
          )}
          {busy ? (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-mist py-3 text-sm text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-ink" />
              {showPhotos ? "Adding your photo…" : "Reading your photo…"}
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <button onClick={() => setPreview(null)} className="btn-ghost flex-1">Retake</button>
              <button onClick={submit} className="btn-primary flex-1">{showPhotos ? "Add to the wall" : "Use this photo"}</button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5">
          <button onClick={() => fileRef.current?.click()} className="btn-primary w-full py-4 text-base">
            📷 Take or choose a photo
          </button>
          <p className="mt-3 text-xs text-slate-400">
            {showPhotos ? "Your photo appears on the shared screen with your caption." : "A photo or a snap of handwriting works. It's analyzed by AI and never stored."}
          </p>
        </div>
      )}

      {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
    </div>
  );
}

// Downscale + re-encode to a compact JPEG data URL so the upload stays small and
// the vision call is fast.
function downscale(file: File, max: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}
