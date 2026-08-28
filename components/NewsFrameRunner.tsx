"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { scoreColor } from "@/lib/canvases";

// Apply a framework to a CURRENT news story: pull fresh stories, pick one, fill
// the framework's fields, make the call, get graded on the application.
export default function NewsFrameRunner({ spec }: { spec: any }) {
  const [phase, setPhase] = useState<"pick" | "analyze" | "verdict" | "report">("pick");
  const [stories, setStories] = useState<any[] | null>(null);
  const [story, setStory] = useState<any>(null);
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [verdict, setVerdict] = useState<Record<string, any>>({});
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const hasVerdict = spec.verdict?.options?.length > 0;

  useEffect(() => {
    fetch("/api/mechanics/news/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: spec.slug }) })
      .then((r) => r.json()).then((d) => { if (d.stories) setStories(d.stories); else setErr(d.error || "Couldn't load stories."); })
      .catch(() => setErr("Couldn't load stories."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function grade() {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/mechanics/news/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: spec.slug, story, analysis, verdict }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.report) throw new Error(d.error || "Couldn't grade.");
      setReport(d.report); setPhase("report");
    } catch (e: any) { setErr(e?.message || "Couldn't grade."); }
    finally { setBusy(false); }
  }

  if (phase === "report" && report) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-2xl border border-line bg-white p-5 text-center shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your application of {spec.framework}</div>
          <div className="mt-1 text-5xl font-bold" style={{ color: scoreColor(report.score || 0) }}>{report.score}</div>
        </div>
        {Array.isArray(report.framework_use) && (
          <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Field by field</div>
            <div className="mt-2 divide-y divide-line">
              {report.framework_use.map((f: any, i: number) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0"><div className="text-sm font-medium text-ink">{f.field}</div>{f.note && <div className="text-xs text-slate-500">{f.note}</div>}</div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${f.quality === "high" ? "bg-sage-soft text-sage" : f.quality === "med" ? "bg-amber-soft text-amber" : "bg-clay-soft text-clay"}`}>{f.quality}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm space-y-2 text-sm">
          {report.analyst_read && <p className="text-slate-700"><b className="text-ink">How an analyst reads it:</b> {report.analyst_read}</p>}
          {report.best_miss && <p className="text-slate-700"><b className="text-ink">Biggest miss:</b> {report.best_miss}</p>}
          {report.verdict_note && <p className="text-slate-700"><b className="text-ink">Your call:</b> {report.verdict_note}</p>}
          {report.principle && <p className="text-ink"><b>Principle:</b> {report.principle}</p>}
        </div>
        <div className="text-center"><Link href="/studio/news" className="btn-ghost text-sm">Done</Link></div>
      </div>
    );
  }

  if (phase === "pick") {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-2xl text-ink">Pick a current story</h1>
        <p className="mt-1 text-sm text-slate2">Fresh headlines on <b>{spec.topic}</b>. Choose one to analyze with {spec.framework}.</p>
        {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
        {stories === null && !err ? (
          <div className="mt-6 text-center text-sm text-slate-400"><div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-ai" /><div className="mt-2">Pulling today&apos;s stories…</div></div>
        ) : (
          <div className="mt-4 space-y-2">
            {(stories || []).map((s, i) => (
              <button key={i} onClick={() => { setStory(s); setPhase("analyze"); }} className="block w-full rounded-2xl border border-line bg-white p-4 text-left transition hover:border-sage hover:shadow-sm">
                <div className="text-sm font-semibold text-ink">{s.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">{s.source && <span>{s.source}</span>}{s.date && <span>· {new Date(s.date).toLocaleDateString()}</span>}<a href={s.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-ai underline">read →</a></div>
                {s.snippet && <div className="mt-1 text-xs leading-relaxed text-slate-600">{s.snippet}</div>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // analyze + verdict share the chosen-story header
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 rounded-xl bg-mist p-3 text-sm"><div className="font-semibold text-ink">{story.title}</div><div className="mt-0.5 text-xs text-slate-400">{story.source} · <a href={story.url} target="_blank" rel="noreferrer" className="text-ai underline">read →</a></div></div>

      {phase === "analyze" && (
        <div className="space-y-3">
          <p className="text-sm text-slate2">Apply <b>{spec.framework}</b> to this story, field by field. Be specific to what&apos;s actually happening here.</p>
          {(spec.fields || []).map((f: any) => (
            <div key={f.key} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-ink">{f.label}</div>
              {f.hint && <div className="text-xs text-slate-400">{f.hint}</div>}
              <textarea className="field mt-2 text-sm" rows={3} value={analysis[f.key] || ""} onChange={(e) => setAnalysis((a) => ({ ...a, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div className="flex justify-end">
            {hasVerdict ? <button onClick={() => setPhase("verdict")} className="btn-primary">Make the call →</button> : <button onClick={grade} disabled={busy} className="btn-primary">{busy ? "Grading…" : "Grade my analysis"}</button>}
          </div>
          {err && <p className="text-sm text-red-700">{err}</p>}
        </div>
      )}

      {phase === "verdict" && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-ink">{spec.verdict.label}</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {spec.verdict.options.map((o: any) => (
                <button key={o.value} onClick={() => setVerdict((v) => ({ ...v, call: o.value }))} className={"rounded-xl border p-3 text-left text-sm font-bold " + (verdict.call === o.value ? "border-ink bg-ink/5 text-ink" : "border-line hover:border-slate-300")}>{o.label}</button>
              ))}
            </div>
            <div className="mt-3"><div className="text-xs text-slate-500">How confident?</div><input type="range" min={0} max={100} step={5} value={verdict.confidence ?? 60} onChange={(e) => setVerdict((v) => ({ ...v, confidence: Number(e.target.value) }))} className="mt-1 w-full accent-[color:var(--ink)]" /><div className="text-right text-sm font-bold text-ink">{verdict.confidence ?? 60}%</div></div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setPhase("analyze")} className="btn-ghost">Back</button>
            <button onClick={grade} disabled={busy} className="btn-primary">{busy ? "Grading…" : "Grade my analysis"}</button>
          </div>
          {err && <p className="text-sm text-red-700">{err}</p>}
        </div>
      )}
    </div>
  );
}
