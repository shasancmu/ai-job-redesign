"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SpecEditor from "@/components/SpecEditor";
import ModuleBuilder from "@/components/ModuleBuilder";
import NegEditor from "@/components/NegEditor";
import BenchEditor from "@/components/BenchEditor";
import AnalyticalEditor from "@/components/AnalyticalEditor";
import RedesignEditor from "@/components/RedesignEditor";
import ExplainerEditor from "@/components/ExplainerEditor";
import NewsFrameEditor from "@/components/NewsFrameEditor";
import AuthoringInterview from "@/components/AuthoringInterview";
import { AUTHOR_FORMATS } from "@/lib/authorFormats";

// Keyed lookup derived from the single source of truth (lib/authorFormats).
const KINDS: Record<string, { label: string; emoji: string; endpoint: string; table?: string; editBase: string }> =
  Object.fromEntries(AUTHOR_FORMATS.map(({ id, ...rest }) => [id, rest]));
const LOADING = ["Reading your materials…", "Finding the interactive core…", "Drafting your modules…"];

export default function AutoBuild({ me, canGlobal, orgName, startMode }: { me: string; canGlobal: boolean; orgName: string | null; startMode?: string }) {
  const supabase = createClient();
  const [phase, setPhase] = useState<"upload" | "interview" | "choose" | "editor" | "created">(startMode === "interview" ? "interview" : "upload");
  const [interviewSource, setInterviewSource] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [source, setSource] = useState("");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [one, setOne] = useState<{ kind: string; spec: any } | null>(null);
  const [created, setCreated] = useState<any[]>([]);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState<{ chars: number; name: string; label: string } | null>(null);

  useEffect(() => { if (!busy) return; const t = setInterval(() => setStep((s) => (s + 1) % LOADING.length), 1700); return () => clearInterval(t); }, [busy]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const ok = Array.from(list).filter((f) => /\.(pdf|docx|txt|md|markdown)$/i.test(f.name) && f.size < 20 * 1024 * 1024);
    setFiles((prev) => [...prev, ...ok].slice(0, 12));
  }

  async function analyze() {
    if (!files.length) return;
    setBusy("analyze"); setErr(""); setStep(0);
    try {
      const payload = await Promise.all(files.map(async (f) => {
        // Extract PDFs in the browser (reliable everywhere) and send text; other
        // types go as bytes for the server to read.
        if (/\.pdf$/i.test(f.name)) {
          try {
            const { extractPdfTextClient } = await import("@/lib/pdfClient");
            const text = await extractPdfTextClient(f);
            if (text.trim()) return { name: f.name, text };
          } catch { /* fall back to sending bytes */ }
        }
        return new Promise<any>((res, rej) => { const r = new FileReader(); r.onload = () => res({ name: f.name, b64: String(r.result).split(",")[1] || "" }); r.onerror = () => rej(new Error("read failed")); r.readAsDataURL(f); });
      }));
      const res = await fetch("/api/mechanics/autobuild", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files: payload }) });
      const d = await res.json().catch(() => ({}));
      const opts = (d.options || []).filter((o: any) => o && KINDS[o.kind]);
      if (!res.ok || opts.length === 0) { setErr(d.error || "Couldn't turn those materials into modules."); }
      else { setOptions(opts); setSource(d.source || ""); setSel(new Set([0])); setPhase("choose"); }
    } catch (e: any) { setErr(e?.message || "Something went wrong."); }
    finally { setBusy(""); }
  }

  // Client-extract what we can from uploaded files, to ground the interview.
  async function collectSource(): Promise<string> {
    const parts: string[] = [];
    for (const f of files) {
      try {
        if (/\.pdf$/i.test(f.name)) { const { extractPdfTextClient } = await import("@/lib/pdfClient"); parts.push(await extractPdfTextClient(f)); }
        else if (/\.(txt|md|markdown)$/i.test(f.name)) parts.push(await f.text());
      } catch { /* skip a file we can't read here */ }
    }
    return parts.join("\n\n").slice(0, 12000);
  }

  async function startInterview() {
    setErr("");
    if (files.length) { setBusy("prep"); try { setInterviewSource(await collectSource()); } catch { setInterviewSource(""); } setBusy(""); }
    else setInterviewSource("");
    setPhase("interview");
  }

  function onInterviewDone(opts: any[], transcript: string) {
    const usable = (opts || []).filter((o) => o && KINDS[o.kind]);
    if (!usable.length) { setErr("Couldn't turn that into modules. Try again."); setPhase("upload"); return; }
    setOptions(usable);
    setSource([interviewSource, transcript].filter(Boolean).join("\n\n"));
    setSel(new Set([0]));
    setPhase("choose");
  }

  async function generateOne(opt: any, onProgress?: (p: { chars: number; name: string }) => void): Promise<any> {
    const res = await fetch(KINDS[opt.kind].endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: opt.concept, sourceText: source, stream: true }) });
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("text/event-stream") && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let spec: any = null; let errText = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n\n")) >= 0) {
          const line = buf.slice(0, nl).split("\n").find((l) => l.startsWith("data:"));
          buf = buf.slice(nl + 2);
          if (!line) continue;
          let evt: any; try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }
          if (evt.type === "progress") onProgress?.({ chars: evt.chars || 0, name: evt.name || "" });
          else if (evt.type === "done") spec = evt.spec;
          else if (evt.type === "error") errText = evt.error || "draft failed";
        }
      }
      if (!spec) throw new Error(errText || "draft failed");
      return spec;
    }
    // Fallback: a route that didn't stream returns plain JSON.
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.spec) throw new Error(d.error || "draft failed");
    return d.spec;
  }

  async function saveDraft(kind: string, spec: any): Promise<{ slug: string }> {
    if (kind === "interview") {
      const res = await fetch("/api/builder/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec, status: "draft", scope: orgName ? "org" : "global" }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.slug) throw new Error(d.error || "save failed");
      return { slug: d.slug };
    }
    const table = KINDS[kind].table!;
    const { error } = await supabase.from(table).upsert({ slug: spec.slug, version: 1, owner_id: me, status: "draft", spec, updated_at: new Date().toISOString() }, { onConflict: "slug,version" });
    if (error) throw new Error(error.message);
    return { slug: spec.slug };
  }

  async function build() {
    const picked = options.filter((_, i) => sel.has(i));
    if (picked.length === 0) return;
    setBusy("build"); setErr(""); setStep(0); setProgress(null);
    try {
      if (picked.length === 1) {
        const spec = await generateOne(picked[0], (p) => setProgress({ ...p, label: picked[0].title || KINDS[picked[0].kind].label }));
        setOne({ kind: picked[0].kind, spec }); setPhase("editor");
      } else {
        const out: any[] = [];
        let idx = 0;
        for (const opt of picked) {
          idx++;
          const label = `${idx} of ${picked.length} · ${opt.title || KINDS[opt.kind].label}`;
          setProgress({ chars: 0, name: "", label });
          try { const spec = await generateOne(opt, (p) => setProgress({ ...p, label })); const { slug } = await saveDraft(opt.kind, spec); out.push({ kind: opt.kind, slug, title: opt.title || spec.name || slug, ok: true }); }
          catch (e: any) { out.push({ kind: opt.kind, title: opt.title, ok: false, err: e?.message }); }
        }
        setCreated(out); setPhase("created");
      }
    } catch (e: any) { setErr(e?.message || "Couldn't build."); }
    finally { setBusy(""); setProgress(null); }
  }

  // ---- editor (single pick) ----
  if (phase === "editor" && one) {
    const k = one.kind, spec = one.spec;
    return (
      <div>
        <div className="mb-3 rounded-xl border border-sage/30 bg-sage-soft px-4 py-2.5 text-sm text-sage">Drafted from your materials. Make a few edits, then Publish.</div>
        {k === "roleplay" && <SpecEditor me={me} initial={spec} initialStatus="draft" />}
        {k === "interview" && <ModuleBuilder initialSpec={spec} canGlobal={canGlobal} orgName={orgName} />}
        {k === "negotiation" && <NegEditor me={me} initial={spec} initialStatus="draft" />}
        {k === "benchmark" && <BenchEditor me={me} initial={spec} initialStatus="draft" />}
        {k === "analytical" && <AnalyticalEditor me={me} initial={spec} initialStatus="draft" />}
        {k === "redesign" && <RedesignEditor me={me} initial={spec} initialStatus="draft" />}
        {k === "explainer" && <ExplainerEditor me={me} initial={spec} initialStatus="draft" />}
        {k === "newsframe" && <NewsFrameEditor me={me} initial={spec} initialStatus="draft" />}
      </div>
    );
  }

  // ---- created (batch) ----
  if (phase === "created") {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          <div className="text-3xl">✓</div>
          <h1 className="mt-2 font-serif text-2xl text-ink">Created {created.filter((c) => c.ok).length} draft{created.filter((c) => c.ok).length === 1 ? "" : "s"}</h1>
          <p className="mt-1 text-sm text-slate-500">Each is a draft in its studio. Edit and publish when ready.</p>
          <div className="mt-4 space-y-2">
            {created.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm">
                <span className="text-ink">{KINDS[c.kind].emoji} {c.title} <span className="text-slate-400">· {KINDS[c.kind].label}</span></span>
                {c.ok ? <Link href={`${KINDS[c.kind].editBase}${c.slug}`} className="btn-ghost text-sm">Edit →</Link> : <span className="text-xs text-red-600">{c.err || "failed"}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 text-center"><button onClick={() => { setPhase("upload"); setFiles([]); setOptions([]); setCreated([]); }} className="text-sm text-slate-400 hover:text-ink">← Start over</button></div>
      </div>
    );
  }

  if (busy === "analyze" || busy === "prep") {
    return (
      <div className="mx-auto max-w-xl"><div className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-ai" /><div className="mt-4 font-serif text-lg text-ink">Reading your materials</div><div className="mt-1 text-sm text-slate-500">{busy === "prep" ? "One moment…" : LOADING[step]}</div></div></div>
    );
  }

  if (busy === "build") {
    const words = progress ? Math.round(progress.chars / 6) : 0;
    // Indeterminate-but-alive fill: eases toward full as content arrives, never quite reaching it.
    const pct = Math.min(96, Math.round(100 * (1 - Math.exp(-words / 260))));
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-ai" />
            <div className="min-w-0">
              <div className="truncate font-serif text-lg text-ink">{progress?.name ? `Writing “${progress.name}”` : "Writing your module"}</div>
              {progress?.label && <div className="truncate text-sm text-slate-500">{progress.label}</div>}
            </div>
          </div>
          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-mist">
            <div className="h-full rounded-full bg-ai transition-all duration-500 ease-out" style={{ width: `${Math.max(6, pct)}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>{words > 0 ? `${words.toLocaleString()} words drafted` : "Starting…"}</span>
            <span>Writing it live, so this can take a moment</span>
          </div>
        </div>
      </div>
    );
  }

  // ---- interview ----
  if (phase === "interview") {
    return <AuthoringInterview sourceText={interviewSource} onDone={onInterviewDone} onCancel={() => setPhase("upload")} />;
  }

  // ---- choose (the menu) ----
  if (phase === "choose") {
    return (
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <h1 className="font-serif text-2xl text-ink">Here&apos;s what you can build</h1>
          <p className="mt-1 text-sm text-slate2">Pick one, or several. Selected ones get drafted for you.</p>
        </div>
        <div className="mt-5 space-y-2">
          {options.map((o, i) => {
            const k = KINDS[o.kind];
            const on = sel.has(i);
            return (
              <button key={i} onClick={() => setSel((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${on ? "border-ai bg-ai/5" : "border-line bg-white hover:border-slate-300"}`}>
                <input type="checkbox" checked={on} readOnly className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-ink">{k.emoji} {o.title} <span className="font-normal text-slate-400">· {k.label}</span></div>
                  {o.rationale && <div className="text-xs text-slate-500">{o.rationale}</div>}
                  {o.concept && <div className="mt-1 text-xs leading-relaxed text-slate-600">{o.concept}</div>}
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={build} disabled={sel.size === 0} className="btn-primary mt-5 w-full text-base disabled:opacity-50">{sel.size <= 1 ? "Build this module →" : `Build ${sel.size} modules →`}</button>
        {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
        <div className="mt-3 text-center"><button onClick={() => { setPhase("upload"); setOptions([]); }} className="text-sm text-slate-400 hover:text-ink">← Different files</button></div>
      </div>
    );
  }

  // ---- upload ----
  return (
    <div className="mx-auto max-w-xl">
      <div className="text-center">
        <div className="text-3xl">📎</div>
        <h1 className="mt-2 font-serif text-3xl text-ink">Turn your teaching materials into modules</h1>
        <p className="mt-2 text-slate2">Drop your slides, readings, or notes. It reads them and proposes several modules you can build — pick one or many.</p>
      </div>
      <label className="mt-6 block cursor-pointer rounded-2xl border-2 border-dashed border-line bg-white p-8 text-center transition hover:border-ai/40">
        <input type="file" multiple accept=".pdf,.docx,.txt,.md,.markdown" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <div className="text-sm font-semibold text-ink">Choose files</div>
        <div className="mt-1 text-xs text-slate-400">PDF, Word (.docx), or text · up to 12 files</div>
      </label>
      {files.length > 0 && (
        <div className="mt-3 space-y-1">
          {files.map((f, i) => (<div key={i} className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-1.5 text-sm"><span className="truncate text-slate-700">📄 {f.name}</span><button onClick={() => setFiles((p) => p.filter((_, k) => k !== i))} className="text-slate-300 hover:text-red-500">✕</button></div>))}
        </div>
      )}
      <button onClick={analyze} disabled={!files.length} className="btn-primary mt-5 w-full text-base disabled:opacity-50">See what I can make →</button>
      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}

      <div className="mt-5 flex items-center gap-3 text-xs text-slate-400"><div className="h-px flex-1 bg-line" />or<div className="h-px flex-1 bg-line" /></div>
      <button onClick={startInterview} className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left transition hover:border-ai/40 hover:shadow-sm">
        <div className="text-2xl">🎙️</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-ink">{files.length ? "Talk it through instead" : "No materials? Talk it through"}</div>
          <div className="text-xs text-slate-500">A few quick questions{files.length ? " about your materials" : ""}, by text or voice, and it proposes what to build.</div>
        </div>
        <span className="shrink-0 text-sm font-semibold text-ai">→</span>
      </button>

      <p className="mt-4 text-center text-xs text-slate-400">Files are read for this draft only and never stored. Scanned PDFs (images) aren't supported.</p>
    </div>
  );
}
